import { Store as StoreType } from "@today/common";

declare module "@today/common" {
  export interface Store extends StoreType {
    selectedItem: string;
  }
}
