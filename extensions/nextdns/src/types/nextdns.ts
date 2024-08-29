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

export interface DomainListProps {
  data: { result: DomainListItem[]; profileName: string };
  isLoading: boolean;
  onRemoveItem: (item: DomainListItem) => Promise<void>;
}

export interface DomainSubmitValues {
  domain: string;
}
