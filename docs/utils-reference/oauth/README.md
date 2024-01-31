# OAuth

Dealing with OAuth can be tedious. So we've built a set of utilities to make that task way easier. There's two part to our utilities:

1. Authenticating with the service using [OAuthService](./OAuthService.md) or some built-in providers (e.g GitHub with `OAuthService.github`)
2. Bringing authentication to Raycast commands using [withAccessToken](./withAccessToken.md) and [`getAccessToken`](./getAccessToken.md)

Here are two different use-cases where you can use the utilities.

## Using a built-in provider

We provide 3rd party providers that you can use out of the box such as GitHub or Linear. Here's how you can use them:

```tsx
import { Detail, LaunchProps } from "@raycast/api";
import { withAccessToken, getAccessToken, OAuthService } from "@raycast/utils";

const github = OAuthService.github({ 
  scopes: "notifications repo read:org read:user read:project" 
});

function AuthorizedComponent(props: LaunchProps) {
  const { token } = getAccessToken();
  return <Detail markdown={`Access token: ${token}`} />;
}

export default withAccessToken(github)(AuthorizedComponent);
```

## Using your own client

```tsx
import { OAuth, Detail, LaunchProps } from "@raycast/api";
import { withAccessToken, getAccessToken, OAuthService } from "@raycast/utils/oauth";

const client = new OAuth.PKCEClient({
  redirectMethod: OAuth.RedirectMethod.Web,
  providerName: "Your Provider Name",
  providerIcon: "provider_icon.png",
  providerId: "yourProviderId",
  description: "Connect your {PROVIDER_NAME} account",
});

const provider = new OAuthService({
  client,
  clientId: "YOUR_CLIENT_ID",
  scopes: "YOUR SCOPES",
  authorizeUrl: "YOUR_AUTHORIZE_URL",
  tokenUrl: "YOUR_TOKEN_URL",
});

function AuthorizedComponent(props: LaunchProps) {
  const { token } = getAccessToken();
  return <Detail markdown={`Access token: ${token}`} />;
}

export default withAccessToken({ authorize: provider.authorize })(AuthorizedComponent);
```