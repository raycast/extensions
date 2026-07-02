export * from "./constants";
export * from "./crypto";
export * from "./mobile";
export * from "./web";

import { MobileApi } from "./mobile";
import { WebApi } from "./web";

export const mobileApi = new MobileApi();
export const webApi = new WebApi();
