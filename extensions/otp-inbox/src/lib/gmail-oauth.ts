import { OAuthService } from "@raycast/utils";
import { getPreferenceValues } from "@raycast/api";

export async function authorize(): Promise<string> {
  const google = OAuthService.google({
    clientId: getPreferenceValues().clientId,
    scope: "https://www.googleapis.com/auth/gmail.readonly",
  });

  // Authorize with Google
  const authRequest = await google.authorize();

  return authRequest;
}
