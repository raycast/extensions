import { withAccessToken } from "@raycast/utils";
import { authorize } from "./oauth";

export const withXAuth = withAccessToken({ authorize });
