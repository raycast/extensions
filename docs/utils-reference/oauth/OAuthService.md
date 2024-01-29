# `OAuthService`

The `OAuthService` class is designed to abstract the OAuth authorization process using the PKCE (Proof Key for Code Exchange) flow, simplifying the integration with various OAuth providers such as Asana, GitHub, and others.

Use [OAuthServiceOptions](#oauthserviceoptions) to configure the `OAuthService` class.

## Example

```ts
const client = new OAuth.PKCEClient({
  redirectMethod: OAuth.RedirectMethod.Web,
  providerName: "GitHub",
  providerIcon: "extension_icon.png",
  providerId: "github",
  description: "Connect your GitHub account",
});

const github = new OAuthService({
  client,
  clientId: "7235fe8d42157f1f38c0",
  scopes: "notifications repo read:org read:user read:project",
  authorizeUrl: "https://github.oauth.raycast.com/authorize",
  tokenUrl: "https://github.oauth.raycast.com/token",
});
```

## Signature

```ts
constructor(options: OAuthServiceOptions): OAuthService
```

### Methods

#### `authorize`

Initiates the OAuth authorization process or refreshes existing tokens if necessary. Returns a promise that resolves with the access token from the authorization flow.

##### Signature

```typescript
authorize(): Promise<string>;
```

##### Example

```typescript
const accessToken = await oauthService.authorize();
```

### Built-in Services

Some services are exposed by default to make it easy to authenticate with them. Here's the full list:

- [Asana](#asana)
- [GitHub](#github)
- [Google](#google)
- [Jira](#jira)
- [Linear](#linear)
- [Slack](#slack)
- [Zoom](#zoom)

These services are all instances of `OAuthService` with the default options being set. However, you're free to configure your own client ID, and URLs for a specific service.

#### Asana

```tsx
const asana = OAuthService.asana({
  clientId: 'custom-client-id', // Optional: If omitted, defaults to a pre-configured client ID
  scope: 'default', // Specify the scopes your application requires
  personalAccessToken: 'personal-access-token', // Optional: For accessing the API directly
});
```

#### GitHub

```tsx
const github = OAuthService.github({
  clientId: 'custom-client-id', // Optional: If omitted, defaults to a pre-configured client ID
  scope: 'repo user', // Specify the scopes your application requires
  personalAccessToken: 'personal-access-token', // Optional: For accessing the API directly
});
```

#### Google

```tsx
const google = OAuthService.google({
  clientId: 'custom-client-id', // Optional: If omitted, defaults to a pre-configured client ID
  scope: 'https://www.googleapis.com/auth/drive.readonly', // Specify the scopes your application requires
  personalAccessToken: 'personal-access-token', // Optional: For accessing the API directly
});
```

#### Jira

```tsx
const jira = OAuthService.jira({
  clientId: 'custom-client-id', // Optional: If omitted, defaults to a pre-configured client ID
  scope: 'read:jira-user read:jira-work', // Specify the scopes your application requires
  personalAccessToken: 'personal-access-token', // Optional: For accessing the API directly
});
```

#### Linear

```tsx
const linear = OAuthService.linear({
  clientId: 'custom-client-id', // Optional: If omitted, defaults to a pre-configured client ID
  scope: 'read write', // Specify the scopes your application requires
  personalAccessToken: 'personal-access-token', // Optional: For accessing the API directly
});
```

#### Slack

```tsx
const slack = OAuthService.slack({
  clientId: 'custom-client-id', // Optional: If omitted, defaults to a pre-configured client ID
  scope: 'emoji:read', // Specify the scopes your application requires
  personalAccessToken: 'personal-access-token', // Optional: For accessing the API directly
});
```

#### Zoom

```tsx
const zoom = OAuthService.zoom({
  clientId: 'custom-client-id', // Optional: If omitted, defaults to a pre-configured client ID
  scope: '', // Specify the scopes your application requires
  personalAccessToken: 'personal-access-token', // Optional: For accessing the API directly
});
```

## Subclassing

You can subclass `OAuthService` to create a tailored service for other OAuth providers by setting predefined defaults.

Here's an example:

```ts
export class CustomOAuthService extends OAuthService {
  constructor(options: ClientConstructor) {
    super({
      client: new OAuth.PKCEClient({
        redirectMethod: OAuth.RedirectMethod.Web,
        providerName: "PROVIDER_NAME",
        providerIcon: "provider.png",
        providerId: "PROVIDER-ID",
        description: "Connect your {PROVIDER_NAME} account",
      }),
      clientId: "YOUR_CLIENT_ID",
      authorizeUrl: "YOUR_AUTHORIZE_URL",
      tokenUrl: "YOUR_TOKEN_URL",
      scope: "YOUR_SCOPES"
      extraParameters: {
        actor: "user",
      },
    });
  }
}
```

## Types

### OAuthServiceOptions

Here's an updated markdown table with a "Type" column:

| Property Name | Description | Type |
|---------------|-------------|------|
| client<mark style="color:red;">*</mark> | The PKCE Client defined using `OAuth.PKCEClient` from `@raycast/api` | `OAuth.PKCEClient` |
| clientId<mark style="color:red;">*</mark> | The app's client ID | `string` |
| scope<mark style="color:red;">*</mark> | The scope of the access requested from the provider | `string` |
| authorizeUrl<mark style="color:red;">*</mark> | The URL to start the OAuth flow | `string` |
| tokenUrl<mark style="color:red;">*</mark> | The URL to exchange the authorization code for an access token | `string` |
| refreshTokenUrl | The URL to refresh the access token if applicable | `string` |
| personalAccessToken | A personal token if the provider supports it | `string` |
| extraParameters | The extra parameters you may need for the authorization request | `Record<string, string>` |
| bodyEncoding | Specifies the format for sending the body of the request. | `json` \| `url-encoded`  |
