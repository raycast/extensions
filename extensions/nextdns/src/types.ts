import { MutatePromise } from "@raycast/utils";

type NextDNSError = {
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

export type Mutate = MutatePromise<{ result: DomainListItem[]; profileName: string }>;

export type DomainListProps = {
  type: "allow" | "deny";
};

export type DomainSubmitValues = {
  domain: string;
};

export type Log = {
  timestamp: string;
  domain: string;
  root: string;
  tracker: string;
  encrypted: boolean;
  protocol: string;
  clientIp: string;
  client: string;
  device: {
    id: string;
    name: string;
    model: string;
  };
  status: string;
  reasons: [];
};

export type NextDNSErrorResult = {
  errors: NextDNSError[];
};
export type NextDNSSuccessResult<T> = {
  data: T;
  meta?: {
    pagination: {
      cursor: string | null;
    };
  };
};

export type AddDomainActionProps = {
  domain: string;
  type: string;
};
