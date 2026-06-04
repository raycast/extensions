export type UmamiAdminUser = {
  id: string;
  username: string;
  password: string;
  role: string;
  logoUrl: string | null;
  displayName: string | null;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
  _count: {
    websiteUser: number;
  };
};

export type UmamiMe = {
  id: string;
  username: string;
  role: string;
  createdAt: string;
  isAdmin: boolean;
};
export type UmamiUpdateMyPassword = {
  currentPassword: string;
  newPassword: string;
};

// Websites
export type AddWebsiteFormValues = {
  domain: string;
  name: string;
};

export type UmamiWebsiteStats = {
  pageviews: {
    value: number;
    prev: number;
  };
  visitors: {
    value: number;
    prev: number;
  };
  visits: {
    value: number;
    prev: number;
  };
  bounces: {
    value: number;
    prev: number;
  };
  totaltime: {
    value: number;
    prev: number;
  };
};
export type UmamiWebsiteStatsV3 = {
  pageviews: number;
  visitors: number;
  visits: number;
  bounces: number;
  totaltime: number;
  comparison: {
    pageviews: number;
    visitors: number;
    visits: number;
    bounces: number;
    totaltime: number;
  };
};

export type UmamiErrorResponse = { error: { message: string; code: string; status: number } };
