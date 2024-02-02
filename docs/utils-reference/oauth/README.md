# OAuth

Dealing with OAuth can be tedious. So we've built a set of utilities to make that task way easier. There's two part to our utilities:

1. Authenticating with a service using [OAuthService](./OAuthService.md) or built-in providers (e.g GitHub with `OAuthService.github`)
2. Bringing authentication to Raycast commands using [withAccessToken](./withAccessToken.md) and [`getAccessToken`](./getAccessToken.md)

`OAuthService`, `withAccessToken`, and `getAccessToken` are designed to work together. You'll find below two different use-cases for which you can use these utils.

## Using a built-in provider

We provide built-in providers that you can use out of the box, such as GitHub or Linear. You don't need to configure anything for them apart from the scope your extension requires.

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

You can see our different providers in the following page: [OAuthService](./OAuthService.md)

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
  scopes: "YOUR_SCOPES",
  authorizeUrl: "YOUR_AUTHORIZE_URL",
  tokenUrl: "YOUR_TOKEN_URL",
});

function AuthorizedComponent(props: LaunchProps) {
  const { token } = getAccessToken();
  return <Detail markdown={`Access token: ${token}`} />;
}

export default withAccessToken({ authorize: provider.authorize })(AuthorizedComponent);
```