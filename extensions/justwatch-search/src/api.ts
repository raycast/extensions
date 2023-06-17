import fetch from "node-fetch";
import { getPreferenceValues, LocalStorage, showToast, Toast } from "@raycast/api";
import { JustWatchMedia, JustWatchMediaOffers, MediaProvider, MediaType } from "./types";

interface Preferences {
  flatrate?: boolean;
  buy?: boolean;
  rent?: boolean;
  free?: boolean;
}

export async function searchMedias(query: string): Promise<JustWatchMedia[]> {
  const countryCode = (await LocalStorage.getItem<string>("country_code")) || "en_CA";

  const searchParams = new URLSearchParams({
    // language: "en",
    body: JSON.stringify({
      page_size: 8,
      page: 1,
      query,
      content_types: ["show", "movie"],
    }),
  });

  const preferences = getPreferenceValues<Preferences>();

  const url = `https://apis.justwatch.com/content/titles/${countryCode}/popular?${searchParams}`;
  const providerUrl = `https://apis.justwatch.com/content/providers/locale/${countryCode}`;

  const providersResponse = await fetch(providerUrl, { method: "GET" });

  const providers = (await providersResponse.json()) as MediaProvider[];

  providers.forEach((provider) => {
    provider.icon_url = "https://images.justwatch.com" + provider.icon_url.replace("{profile}", "s100");
  });

  const response = await fetch(url, { method: "GET" });

  if (!response.ok) {
    await showToast(
      Toast.Style.Failure,
      "Couldn't get results",
      "There was an error showing results for this search query."
    );
    return [];
  }

  let parsedMedias: any;

  await response.json().then((data: any) => {
    parsedMedias = parseItems(data.items);
  });

  function parseItems(data: any) {
    const medias: Array<JustWatchMedia> = [];

    data.forEach((value: any) => {
      let thumbnail: string = value.poster;
      thumbnail = thumbnail?.replace("{profile}", "s718");
      const backdrop = thumbnail?.replace("poster", "backdrop").replace("s718", "s1440");

      let imdb_score,
        imdb_votes = null;

      if (value.scoring !== undefined && value.scoring.length > 0) {
        for (const score of value.scoring) {
          if (score.provider_type === "imdb:score") {
            imdb_score = score.value;
          }

          if (score.provider_type === "imdb:votes") {
            imdb_votes = score.value;
          }
        }
      }

      const media: JustWatchMedia = {
        id: value.id,
        name: value.title,
        type: value.object_type,
        year: value.original_release_year,
        thumbnail: `https://images.justwatch.com${thumbnail}`,
        backdrop: `https://images.justwatch.com${backdrop}/name.webp`,
        jw_url: `https://justwatch.com${value.full_path}`,
        is_movie: value.object_type === "movie",
        offers: [],
        imdb_votes: imdb_votes,
        imdb_score: imdb_score,
      };

      if (value.offers === undefined || value.offers.length === 0) {
        medias.push(media);
        return;
      }

      value.offers.forEach((offer: any) => {
        // Search for provider against the database of providers to get the logo, full name, and more
        const provider = providers.find((item) => item.short_name == offer.package_short_name);

        // if we've found it, then save it...

        if (provider) {
          // if monetization type is "ads", then make it free...
          if (offer.monetization_type === "ads") {
            offer.monetization_type = "free";
          }

          const mediaOffer: JustWatchMediaOffers = {
            type: offer.monetization_type,
            type_parsed: getMediaType(offer.monetization_type),
            service: offer.package_short_name,
            url: offer.package_short_name === "dnp" ? offer.urls.deeplink_web : offer.urls.standard_web,
            seasons:
              offer.element_count === 1 ? "1 season" : offer.element_count ? `${offer.element_count} seasons` : "",
            price_amount: offer.retail_price || 0,
            currency: offer.currency,
            icon: provider.icon_url,
            name: provider.clear_name,
            presentation_type: offer.presentation_type?.toUpperCase(),
          };

          // check preferences and ensure we show the results...
          if (preferences[mediaOffer.type] !== undefined && preferences[mediaOffer.type]) {
            media.offers.push(mediaOffer);
          }
        }
      });

      if (media.offers.length > 0) {
        media.offers = sortMedia(media.offers);
        media.offers = removeDuplicates(media.offers);
        media.offers = removeLowerQuality(media.offers);
        aggregateOtherOffersPrices(media.offers); // this function mutates media.offers in-place
        media.offers = keepFirstRemoveRest(media.offers);
        media.offers = sortMediaFinal(media.offers);
      }

      medias.push(media);
    });

    return medias;
  }

  return parsedMedias;

  function sortMedia(offers: JustWatchMediaOffers[]) {
    return offers.sort((a, b) => {
      const streamOrder = ["stream", "free", "rent", "buy"];
      const orderA = streamOrder.indexOf(a.type);
      const orderB = streamOrder.indexOf(b.type);

      if (orderA !== orderB) {
        return orderA - orderB;
      } else {
        return a.presentation_type.localeCompare(b.presentation_type) || a.price_amount - b.price_amount;
      }
    });
  }

  function removeDuplicates(offers: JustWatchMediaOffers[]) {
    return offers.filter(
      (offer, index, self) =>
        index === self.findIndex((t) => t.url === offer.url && t.price_amount === offer.price_amount)
    );
  }

  function removeLowerQuality(offers: JustWatchMediaOffers[]) {
    return offers.filter(
      (offer, index, self) =>
        index ===
        self.findIndex(
          (t) => t.service === offer.service && t.price_amount === offer.price_amount && t.type === offer.type
        )
    );
  }

  function aggregateOtherOffersPrices(offers: JustWatchMediaOffers[]) {
    const rentOrBuyOffers = offers.filter((offer) => ["rent", "buy"].includes(offer.type));

    for (const offer of rentOrBuyOffers) {
      const otherOffers = offers.filter(
        (o) => o.service === offer.service && o.type === offer.type && o.price_amount !== offer.price_amount
      );

      if (otherOffers.length > 0) {
        offer.other_prices = otherOffers.map(({ price_amount, currency, seasons, presentation_type }) => ({
          price_amount,
          currency,
          seasons,
          presentation_type,
        }));
      }
    }
  }

  function keepFirstRemoveRest(offers: JustWatchMediaOffers[]) {
    return offers.filter(
      (offer, index, self) => index === self.findIndex((t) => t.service === offer.service && t.type === offer.type)
    );
  }

  function sortMediaFinal(offers: JustWatchMediaOffers[]) {
    return sortMedia(offers); // reusing the initial sort function
  }

  function getMediaType(type: string) {
    if (type === MediaType.buy) {
      return "Purchase";
    }

    if (type === MediaType.rent) {
      return "Rent";
    }

    if (type == MediaType.stream) {
      return "Streaming";
    }

    if (type == MediaType.free) {
      return "Free";
    }

    return "";
  }
}
