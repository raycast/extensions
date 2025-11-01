import { Color } from "@raycast/api";
import type { JustWatchMedia } from "@/types";
import { MediaType } from "@/types";

export const getParsedCurrency = (amount: number, currency: string, countryCode: string | null) => {
  const formatter = new Intl.NumberFormat(countryCode?.replace("_", "-"), {
    style: "currency",
    currency: currency,
  });

  return formatter.format(amount);
};

export const getImdbRating = (media: JustWatchMedia, countryCode: string | null) => {
  let rating, votes;
  if (media.imdbScore) {
    rating = `${media.imdbScore.toString()}★`;
  }
  if (media.imdbVotes) {
    votes = `${media.imdbVotes.toLocaleString(countryCode?.replace("_", "-"))} votes`;
  }

  if (rating && votes) {
    return `${rating} ⸱ ${votes}`;
  }

  if (rating) {
    return `${rating}`;
  }

  if (votes) {
    return `${votes}`;
  }

  return "N/A";
};

export const getColor = (type: string) => {
  switch (type) {
    case MediaType.buy:
      return Color.Blue;
    case MediaType.rent:
      return Color.Purple;
    case MediaType.stream:
      return Color.Green;
    case MediaType.free:
      return Color.Magenta;
    // return "#1956EF";
    default:
      return Color.SecondaryText;
  }
};
