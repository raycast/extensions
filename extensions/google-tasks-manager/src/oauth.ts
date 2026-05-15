import { OAuthService } from "@raycast/utils";
import { getPreferenceValues } from "@raycast/api";

const { clientId } = getPreferenceValues<Preferences>();

export const google = OAuthService.google({
  clientId,
  scope: "https://www.googleapis.com/auth/tasks",
});
