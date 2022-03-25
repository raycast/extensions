import fetch from "node-fetch";
import { LocalStorage, showToast, Toast } from "@raycast/api";
import { JustWatchMedia, JustWatchMediaOffers, MediaProvider } from "./types";
import { getPreferenceValues } from "@raycast/api";

interface Preferences {
  flatrate?: boolean;
  buy?: boolean;
  rent?: boolean;
  free?: boolean;
}

export async function searchMedias(query: string): Promise<JustWatchMedia[]> {
  const countryCode = (await LocalStorage.getItem<string>("country_code")) || "en_CA";

  const searchParams = new URLSearchParams({
    language: "en",
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
      const media: JustWatchMedia = {
        id: value.id,
        name: value.title,
        type: value.object_type,
        year: value.original_release_year,
        thumbnail: `https://images.justwatch.com${thumbnail}`,
        jw_url: `https://justwatch.com${value.full_path}`,
        offers: [],
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
          const mediaOffer: JustWatchMediaOffers = {
            type: offer.monetization_type,
            service: offer.package_short_name,
            url: offer.package_short_name === "dnp" ? offer.urls.deeplink_web : offer.urls.standard_web,
            seasons: offer.element_count ? offer.element_count + " seasons" : "",
            price_amount: offer.retail_price || 0,
            price: `${offer.retail_price} ${offer.currency}`,
            icon: provider.icon_url,
            name: provider.clear_name,
          };

          // check preferences and ensure we show the results...
          if (preferences[mediaOffer.type] !== undefined && preferences[mediaOffer.type]) {
            media.offers.push(mediaOffer);
          }
        }
      });

      // sort by free streaming > rent > buy
      media.offers.sort((a, b) => a.price_amount - b.price_amount);

      // loop through offers and remove the duplicate ones...
      if (media.offers.length > 0) {
        media.offers = media.offers.filter((tag, index, array) => array.findIndex((t) => t.url == tag.url) == index);
      }

      medias.push(media);
    });

    return medias;
  }

  return parsedMedias;
}
