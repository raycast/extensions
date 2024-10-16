export type Person = {
  __typename: "Person";
  id: string;
  createdAt: string;
  updatedAt?: string;
  deletedAt?: string | null;
  name: {
    __typename?: "FullName";
    firstName: string;
    lastName: string;
  };
  avatarUrl?: string;
  jobTitle: string;
  linkedinLink: {
    __typename?: "Links";
    primaryLinkUrl: string;
    primaryLinkLabel: string;
  };
  xLink: {
    __typename?: "Links";
    primaryLinkUrl: string;
    primaryLinkLabel: string;
  };
  city: string;
  email: string;
  phone: string;
  companyId?: string;
  position?: number;
  links?: {
    __typename: "Links";
    primaryLinkUrl: string;
    primaryLinkLabel: "";
  };
};

export type Company = {
  __typename: "Company";
  id: string;
  createdAt: string;
  updatedAt?: string;
  deletedAt?: string | null;
  name: string;
  domainName:
    | string
    | {
        __typename?: "Links";
        primaryLinkUrl: string;
        primaryLinkLabel: string;
      };
  address: string;
  accountOwnerId?: string | null;
  position?: number;
  linkedinLink: {
    __typename?: "Links";
    primaryLinkUrl: string;
    primaryLinkLabel: string;
  };
  xLink?: {
    __typename?: "Links";
    primaryLinkUrl: string;
    primaryLinkLabel: string;
  };
  annualRecurringRevenue: {
    __typename?: "Currency";
    amountMicros: number | null;
    currencyCode: string;
  };
  employees: number | null;
  idealCustomerProfile?: boolean;
};
