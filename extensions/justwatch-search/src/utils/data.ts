import { getPreferenceValues } from "@raycast/api";
import type { JustWatchMedia, JustWatchMediaOffers, Node } from "@/types";
import { MediaType } from "@/types";

const preferences = getPreferenceValues<Preferences>();

function sortMedia(offers: JustWatchMediaOffers[]) {
  return offers.sort((a, b) => {
    const streamOrder = ["stream", "free", "rent", "buy"];
    const orderA = streamOrder.indexOf(a.type);
    const orderB = streamOrder.indexOf(b.type);

    if (orderA !== orderB) {
      return orderA - orderB;
    } else {
      return a.presentationType.localeCompare(b.presentationType) || a.priceAmount - b.priceAmount;
    }
  });
}

function removeDuplicates(offers: JustWatchMediaOffers[]) {
  return offers.filter(
    (offer, index, self) => index === self.findIndex((t) => t.url === offer.url && t.priceAmount === offer.priceAmount),
  );
}

function removeLowerQuality(offers: JustWatchMediaOffers[]) {
  return offers.filter(
    (offer, index, self) =>
      index ===
      self.findIndex(
        (t) => t.service === offer.service && t.priceAmount === offer.priceAmount && t.type === offer.type,
      ),
  );
}

function aggregateOtherOffersPrices(offers: JustWatchMediaOffers[]) {
  const rentOrBuyOffers = offers.filter((offer) => ["rent", "buy"].includes(offer.type));

  for (const offer of rentOrBuyOffers) {
    const otherOffers = offers.filter(
      (o) => o.service === offer.service && o.type === offer.type && o.priceAmount !== offer.priceAmount,
    );

    if (otherOffers.length > 0) {
      offer.otherPrices = otherOffers.map(({ priceAmount, currency, seasons, presentationType }) => ({
        priceAmount,
        currency,
        seasons,
        presentationType,
      }));
    }
  }
}

function keepFirstRemoveRest(offers: JustWatchMediaOffers[]) {
  return offers.filter(
    (offer, index, self) => index === self.findIndex((t) => t.service === offer.service && t.type === offer.type),
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

export const parseItems = (data: Node[]) => {
  const medias: Array<JustWatchMedia> = [];

  data.forEach((value) => {
    let thumbnail: string = value.content.posterUrl;
    thumbnail = thumbnail?.replace("{profile}", "s718").replace("{format}", "jpg");
    const backdrop = thumbnail?.replace("poster", "backdrop").replace("s718", "s1440");

    const media: JustWatchMedia = {
      id: value.id,
      name: value.content.title,
      type: value.objectType,
      year: value.content.originalReleaseYear,
      thumbnail: `https://images.justwatch.com${thumbnail}`,
      backdrop: `https://images.justwatch.com${backdrop}/name.webp`,
      jwUrl: `https://justwatch.com${value.content.fullPath}`,
      isMovie: value.objectType === "MOVIE",
      offers: [],
      imdbVotes: value.content.scoring.imdbVotes,
      imdbScore: value.content.scoring.imdbScore,
      imdbUrl: `https://www.imdb.com/title/${value.content.externalIds.imdbId}`,
    };

    if (value.offers === undefined || value.offers.length === 0) {
      medias.push(media);
      return;
    }

    value.offers.forEach((offer) => {
      offer.monetizationType = offer.monetizationType.toLowerCase();

      // Search for provider against the database of providers to get the logo, full name, and more
      const provider = offer.package;

      // if we've found it, then save it...
      if (provider.id) {
        // if monetization type is "ads", then make it free...
        if (offer.monetizationType === "ads") {
          offer.monetizationType = "free";
        }
        const mediaOffer: JustWatchMediaOffers = {
          type: offer.monetizationType as MediaType,
          type_parsed: getMediaType(offer.monetizationType),
          service: provider.clearName,
          url: offer.deeplinkURL ? offer.deeplinkURL : offer.standardWebURL,
          seasons: offer.elementCount === 1 ? "1 season" : offer.elementCount ? `${offer.elementCount} seasons` : "",
          priceAmount: offer.retailPriceValue || 0,
          priceString: offer.retailPrice || "0",
          currency: offer.currency,
          icon: "https://images.justwatch.com" + provider.icon.replace("{profile}", "s100").replace("{format}", "png"),
          name: provider.clearName,
          presentationType: offer.presentationType?.toUpperCase().replace("_", ""),
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
};
