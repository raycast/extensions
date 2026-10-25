import { OAuthService } from "@raycast/utils";

// Raycast owns the registered OAuth app and credential storage.
export const github = OAuthService.github({ scope: "repo" });
