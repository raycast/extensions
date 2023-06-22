export interface GoogleBooksResponse {
  kind: string;
  totalItems: number;
  items: VolumeItem[];
}
export interface VolumeItem {
  kind: string;
  id: string;
  etag: string;
  selfLink: string;
  volumeInfo: VolumeInfo;
  saleInfo: SaleInfo;
  accessInfo: AccessInfo;
  searchInfo?: SearchInfo;
}
interface VolumeInfo {
  title: string;
  subtitle?: string;
  authors?: string[];
  publisher?: string;
  publishedDate: string;
  description?: string;
  industryIdentifiers?: IndustryIdentifiersItem[];
  readingModes: ReadingModes;
  pageCount: number;
  printType: string;
  categories?: string[];
  averageRating?: number;
  ratingsCount?: number;
  maturityRating: string;
  allowAnonLogging: boolean;
  contentVersion: string;
  panelizationSummary?: PanelizationSummary;
  imageLinks: ImageLinks;
  language: string;
  previewLink: string;
  infoLink: string;
  canonicalVolumeLink: string;
}
interface IndustryIdentifiersItem {
  type: string;
  identifier: string;
}
interface ReadingModes {
  text: boolean;
  image: boolean;
}
interface PanelizationSummary {
  containsEpubBubbles: boolean;
  containsImageBubbles: boolean;
}
interface ImageLinks {
  smallThumbnail: string;
  thumbnail: string;
}
interface SaleInfo {
  country: string;
  saleability: string;
  isEbook: boolean;
  listPrice?: ListPrice;
  retailPrice?: RetailPrice;
  buyLink?: string;
  offers?: OffersItem[];
}
interface ListPrice {
  amount?: number;
  currencyCode: string;
  amountInMicros?: number;
}
interface RetailPrice {
  amount?: number;
  currencyCode: string;
  amountInMicros?: number;
}
interface OffersItem {
  finskyOfferType: number;
  listPrice: ListPrice;
  retailPrice: RetailPrice;
  giftable: boolean;
}
interface AccessInfo {
  country: string;
  viewability: string;
  embeddable: boolean;
  publicDomain: boolean;
  textToSpeechPermission: string;
  epub: Epub;
  pdf: Pdf;
  webReaderLink: string;
  accessViewStatus: string;
  quoteSharingAllowed: boolean;
}
interface Epub {
  isAvailable: boolean;
  acsTokenLink?: string;
}
interface Pdf {
  isAvailable: boolean;
  acsTokenLink?: string;
}
interface SearchInfo {
  textSnippet: string;
}
