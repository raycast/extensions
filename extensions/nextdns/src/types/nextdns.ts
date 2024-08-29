import { MutatePromise } from "@raycast/utils";

export type NextDNSError = {
  code: string;
  detail?: string;
  source?: {
    parameter: string;
  };
};

export type DomainListItem = {
  id: string;
  active: boolean;
  type: string;
};

export type Profile = {
  data: {
    id: string;
    name: string;
  };
};

export type Mutate = MutatePromise<{ result: DomainListItem[]; profileName: string; }>;

export interface DomainListProps {
  // data: { result: DomainListItem[]; profileName: string };
  type: "allow" | "deny";
  // isLoading: boolean;
  // mutate: Mutate;
}

export interface DomainSubmitValues {
  domain: string;
}