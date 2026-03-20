export type TimePolicy = {
  id: string;
  userId: string;
  policyType: string;
  policy: unknown;
  title: string;
  description: string;
  features: Array<string>;
};
