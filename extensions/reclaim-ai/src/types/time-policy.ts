export type TimePolicy = {
  id: string;
  userId: string;
  policyType: string;
  policy: unknown;
  taskCategory: string;
  title: string;
  description: string;
  features: Array<string>;
};
