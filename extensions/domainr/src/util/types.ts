import { Color, Icon } from "@raycast/api";
import * as t from "io-ts";
import { match } from "ts-pattern";

// Search
export const SearchResult = t.type({
  domain: t.string,
  host: t.string,
  subdomain: t.string,
  zone: t.string,
  path: t.string,
  registerURL: t.string,
});

export const SearchResponse = t.type({
  results: t.array(SearchResult),
});

export type ISearchResult = t.TypeOf<typeof SearchResult>;
export type ISearchResponse = t.TypeOf<typeof SearchResponse>;

// Status
export const StatusResult = t.type({
  domain: t.string,
  zone: t.string,
  status: t.string,
  summary: t.string,
});

export const StatusResponse = t.type({
  status: t.array(StatusResult),
});

export type IStatusResult = t.TypeOf<typeof StatusResult>;
export type IStatusResponse = t.TypeOf<typeof StatusResponse>;

export enum DomainStatus {
  Unknown = "Unknown",
  Available = "Available",
  Pending = "Available",
  Disallowed = "Disallowed",
  Invalid = "Invalid",
  Reserved = "Reserved",
  Taken = "Taken",
  Aftermarket = "Aftermarket",
}

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

export type SearchResultWithStatus = ISearchResult & {
  status: Status;
};

export const getStatusIcon = (status: string) =>
  match(status)
    .with(DomainStatus.Available, () => ({
      source: Icon.Checkmark,
      tintColor: Color.Green,
    }))
    .with(DomainStatus.Aftermarket, () => ({
      source: Icon.QuestionMark,
      tintColor: Color.Yellow,
    }))
    .otherwise(() => ({
      source: Icon.XmarkCircle,
      tintColor: Color.Red,
    }));
