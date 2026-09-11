import { getPreferenceValues } from "@raycast/api";
import { OAuthService } from "@raycast/utils";

const SCOPE = "https://www.googleapis.com/auth/contacts";

let _google: OAuthService | undefined;

export function google(): OAuthService {
  if (!_google) {
    const { googleClientId } = getPreferenceValues<Preferences>();
    if (!googleClientId || !googleClientId.trim()) {
      throw new Error("Google Client ID is not configured. Please set it in the extension preferences (Cmd+Shift+,).");
    }
    _google = OAuthService.google({
      clientId: googleClientId.trim(),
      scope: SCOPE,
    });
  }
  return _google;
}
