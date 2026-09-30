import { createManagementClient, createStorefrontClient } from "@paynow-gg/typescript-sdk";

export class Paynow {
  public management: ReturnType<typeof createManagementClient>;
  public storefront: ReturnType<typeof createStorefrontClient>;

  constructor({ storeId, apiKey }: { storeId: string; apiKey: string }) {
    this.management = createManagementClient(storeId, apiKey);
    this.storefront = createStorefrontClient(storeId);
  }
}
