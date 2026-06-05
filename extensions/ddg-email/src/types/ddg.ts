export type DdgLoginResponse = {
  token: string;
};

export type DdgDashboardResponse = {
  user?: {
    access_token?: string;
    username?: string;
    email?: string;
    cohort?: string;
  };
};

export type DdgGenerateAddressResponse = {
  address?: string;
};

export type StoredSession = {
  accessToken: string;
  username?: string;
  email?: string;
  updatedAt: string;
};

export type RecentAlias = {
  alias: string;
  fullAddress: string;
  createdAt: string;
};
