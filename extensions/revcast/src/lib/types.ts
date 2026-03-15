export type ProjectId = string;
export type SubscriptionPlan = "starter" | "pro";
export type LicenseStateStatus = "active" | "inactive" | "invalid";

export type ProjectInput = {
  name: string;
  secretKey: string;
  dashboardUrl?: string;
};

export type StripeProject = {
  id: ProjectId;
  name: string;
  secretKey: string;
  dashboardUrl: string;
  createdAt: string;
  updatedAt: string;
  isDemo?: boolean;
};

export type RevenueSnapshot = {
  currency: string;
  todayRevenue: number;
  todayRevenueContext: string;
  todayRevenueDelta?: number | null;
  mrr: number;
  mrrContext: string;
  newCustomers: number;
  newCustomersContext: string;
  failedPaymentsCount: number;
  revenueAtRisk: number;
  generatedAt: string;
};

export type FailedPayment = {
  id: string;
  customerName: string;
  customerEmail: string;
  amount: number;
  currency: string;
  retryAt: string | null;
  status: "retrying" | "final";
  reason: string;
  stripeUrl: string;
  reviewed: boolean;
};

export type LicenseState = {
  customerEmail: string;
  customerName: string;
  instanceId: string;
  instanceName: string;
  licenseKey: string;
  licenseKeyId: string;
  licenseStatus: string;
  plan: SubscriptionPlan;
  productId: string;
  status: LicenseStateStatus;
  subscriptionStatus: string | null;
  updatedAt: string;
};
