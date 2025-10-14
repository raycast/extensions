import { Unkey } from "@unkey/api";
import { ACCESS_TOKEN } from "./utils/constants";

export const unkey = new Unkey({
    rootKey: ACCESS_TOKEN
})