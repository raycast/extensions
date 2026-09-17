export type InstanceType = "development" | "production";

export type ClerkApp = {
  id: string;
  name: string;
  instanceType: InstanceType;
  secretKey: string;
};
