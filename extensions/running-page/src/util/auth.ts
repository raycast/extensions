import { OAuthService } from "@raycast/utils";

export const github = OAuthService.github({ scope: "repo" });
