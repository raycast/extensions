import { Color, Icon, Image } from "@raycast/api";
import { VolumeItem } from "../types/google-books.dt";

const PLACEHOLDER_COVER = "book-cover-placeholder.png";

export function bookCount(n: number): string {
  return `${n} ${n === 1 ? "book" : "books"}`;
}

export function getLargeCover(item: VolumeItem): string | undefined {
  const thumb = item.volumeInfo?.imageLinks?.thumbnail;
  if (!thumb) return undefined;
  return thumb.replace("http://", "https://").replace(/zoom=\d/, "zoom=3");
}

export function getMaskedImage(item: VolumeItem | undefined): Image.ImageLike {
  const cover = item ? getLargeCover(item) : undefined;
  return cover
    ? { source: cover, mask: Image.Mask.RoundedRectangle }
    : { source: Icon.Book, tintColor: Color.SecondaryText };
}

export function getGridCover(item: VolumeItem): Image.ImageLike {
  return getLargeCover(item) ?? PLACEHOLDER_COVER;
}

export function convertInfoToMarkdown(item: VolumeItem): string {
  const authors = item.volumeInfo?.authors?.join(", ");
  return (
    "# " +
    (item.volumeInfo?.title ?? "") +
    (item.volumeInfo?.subtitle ? "\n\n**" + item.volumeInfo.subtitle + "**" : "") +
    "\n\n---\n\n" +
    (authors ? "*By " + authors + "*\n\n" : "") +
    // Chunk long text into paragraphs
    (item.volumeInfo?.description?.replace(/(.*?(?:\. |\? |! )){3}/g, "$&\n\n") ?? "")
  );
}

export function formatPrice(item: VolumeItem): string | undefined {
  const retail = item.saleInfo?.retailPrice;
  const list = item.saleInfo?.listPrice;
  const price = retail ?? list;
  if (price?.amount == null) return undefined;
  if (price.amount === 0) return "Free";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: price.currencyCode,
  }).format(price.amount);
}

export function getISBN(item: VolumeItem): string | undefined {
  const ids = item.volumeInfo?.industryIdentifiers;
  if (!ids?.length) return undefined;
  const isbn13 = ids.find((id) => id.type === "ISBN_13");
  const isbn10 = ids.find((id) => id.type === "ISBN_10");
  return isbn13?.identifier ?? isbn10?.identifier;
}
