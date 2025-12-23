import { Color, Icon, Image } from "@raycast/api";

// Search
type SearchResult = {
  domain: string;
  subdomain: string;
  zone: string;
};
type SearchResponse = {
  results: SearchResult[];
};
export type ISearchResponse = SearchResponse;

// Status
export type Status =
  | "unknown"
  | "undelegated"
  | "inactive"
  | "pending"
  | "claimed"
  | "reserved"
  | "disallowed"
  | "dpml"
  | "invalid"
  | "active"
  | "parked"
  | "marketed"
  | "expiring"
  | "priced"
  | "transferable"
  | "premium"
  | "suffix"
  | "tld"
  | "zone"
  | "deleting";
type StatusResult = {
  domain: string;
  zone: string;
  status: Status;
  tags: string;
};
export type IStatusResult = StatusResult;

export enum DomainStatus {
  Unknown = "Unknown",
  Available = "Available",
  // eslint-disable-next-line @typescript-eslint/no-duplicate-enum-values
  Pending = "Available",
  Disallowed = "Disallowed",
  Invalid = "Invalid",
  Reserved = "Reserved",
  Taken = "Taken",
  Aftermarket = "Aftermarket",
}

export const getStatusIcon = (status: DomainStatus): Image.ImageLike => {
  switch (status) {
    case DomainStatus.Available:
      return {
        source: Icon.Checkmark,
        tintColor: Color.Green,
      };
    case DomainStatus.Aftermarket:
      return {
        source: Icon.QuestionMark,
        tintColor: Color.Yellow,
      };
    default:
      return {
        source: Icon.XMarkCircle,
        tintColor: Color.Red,
      };
  }
};
