import { Color, Icon, Image } from "@raycast/api";

// API Error Response
export type ErrorResult = {
  msg?: string;
  error?: string;
  message?: string;
};

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

// Status - individual status values returned by the API
export type StatusValue =
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

// API returns space-delimited status string (e.g., "marketed undelegated")
export type Status = string;

type StatusResult = {
  domain: string;
  zone: string;
  status: Status;
  tags: string;
};
export type IStatusResult = StatusResult;

/**
 * Simplified domain availability status, inspired by the Domainr Mac app.
 * - Available: Can be registered directly
 * - Maybe: Registered but potentially obtainable (aftermarket, expiring, etc.)
 * - Unavailable: Cannot be obtained
 */
export enum DomainStatus {
  Available = "Available",
  Maybe = "Maybe",
  Unavailable = "Unavailable",
}

export const getStatusIcon = (status: DomainStatus): Image.ImageLike => {
  switch (status) {
    case DomainStatus.Available:
      return {
        source: Icon.CheckCircle,
        tintColor: Color.Green,
      };
    case DomainStatus.Maybe:
      return {
        source: Icon.QuestionMarkCircle,
        tintColor: Color.Yellow,
      };
    case DomainStatus.Unavailable:
      return {
        source: Icon.Xmark,
        tintColor: Color.Red,
      };
  }
};
