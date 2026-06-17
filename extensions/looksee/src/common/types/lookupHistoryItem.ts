import { LookupResponse } from "./lookupResponse";

export interface LookupHistoryItem {
  address: string;
  success: boolean;
  lookupTimestamp: number;
  lookupResponse?: LookupResponse;
}
