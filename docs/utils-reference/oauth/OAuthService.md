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
  scope: "notifications repo read:org read:user read:project",
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

```ts
OAuthService.authorize(): Promise<string>;
```

##### Example

```typescript
const accessToken = await oauthService.authorize();
```

### Built-in Services

Some services are exposed as static properties in `OAuthService` to make it easy to authenticate with them:

- [Asana](#asana)
- [GitHub](#github)
- [Google](#google)
- [Jira](#jira)
- [Linear](#linear)
- [Slack](#slack)
- [Zoom](#zoom)

Asana, GitHub, Linear, and Slack already have an OAuth app configured by Raycast so that you can use them right of the box by specifing only the permission scopes. You are still free to create an OAuth app for them if you want.

Google, Jira and Zoom don't have an OAuth app configured by Raycast so you'll have to create one if you want to use them.

Use [ProviderOptions](#provideroptions) or [ProviderWithDefaultClientOptions](#providerwithdefaultclientoptions) to configure these built-in services.

#### Asana

##### Signature

```ts
OAuthService.asana: (options: ProviderWithDefaultClientOptions) => OAuthService
```

##### Example

```tsx
const asana = OAuthService.asana({ scope: "default" });
```

#### GitHub

##### Signature

```ts
OAuthService.github: (options: ProviderWithDefaultClientOptions) => OAuthService
```

##### Example

```tsx
const github = OAuthService.github({ scope: "repo user" });
```

#### Google

Google has verification processes based on the required scopes for your extension. Therefore, you need to configure your own client for it.

{% hint style="info" %}
Creating your own Google client ID is more tedious than other processes, so we’ve created a page to assist you: [Getting a Google client ID](./getting-google-client-id.md)
{% endhint %}


##### Signature

```ts
OAuthService.google: (options: ProviderOptions) => OAuthService
```

##### Example

```tsx
const google = OAuthService.google({
  clientId: "custom-client-id",
  scope: "https://www.googleapis.com/auth/drive.readonly",
});
```

#### Jira

Jira requires scopes to be enabled manually in the OAuth app settings. Therefore, you need to configure your own client for it.

##### Signature

```ts
OAuthService.jira: (options: ProviderOptions) => OAuthService
```

##### Example

```tsx
const jira = OAuthService.jira({
  clientId: "custom-client-id",
  scope: "read:jira-user read:jira-work offline_access",
});
```

#### Linear

##### Signature

```ts
OAuthService.linear: (options: ProviderOptions) => OAuthService
```

##### Example

```tsx
const linear = OAuthService.linear({ scope: "read write" });
```

#### Slack

##### Signature

```ts
OAuthService.slack: (options: ProviderWithDefaultClientOptions) => OAuthService
```

##### Example

```tsx
const slack = OAuthService.slack({ scope: "emoji:read" });
```

#### Zoom

Zoom requires scopes to be enabled manually in the OAuth app settings. Therefore, you need to configure your own client for it.

##### Signature

```ts
OAuthService.zoom: (options: ProviderOptions) => OAuthService
```

##### Example

```tsx
const zoom = OAuthService.zoom({
  clientId: "custom-client-id",
  scope: "meeting:write",
});
```

## Types

### OAuthServiceOptions

| Property Name                                  | Description                                                                                                                        | Type                                         |
| ---------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------- |
| client<mark style="color:red;">\*</mark>       | The PKCE Client defined using `OAuth.PKCEClient` from `@raycast/api`                                                               | `OAuth.PKCEClient`                           |
| clientId<mark style="color:red;">\*</mark>     | The app's client ID                                                                                                                | `string`                                     |
| scope<mark style="color:red;">\*</mark>        | The scope of the access requested from the provider                                                                                | `string` \| `Array<string>`                  |
| authorizeUrl<mark style="color:red;">\*</mark> | The URL to start the OAuth flow                                                                                                    | `string`                                     |
| tokenUrl<mark style="color:red;">\*</mark>     | The URL to exchange the authorization code for an access token                                                                     | `string`                                     |
| refreshTokenUrl                                | The URL to refresh the access token if applicable                                                                                  | `string`                                     |
| personalAccessToken                            | A personal token if the provider supports it                                                                                       | `string`                                     |
| onAuthorize                                    | A callback function that is called once the user has been properly logged in through OAuth when used with `withAccessToken`        | `string`                                     |
| extraParameters                                | The extra parameters you may need for the authorization request                                                                    | `Record<string, string>`                     |
| bodyEncoding                                   | Specifies the format for sending the body of the request.                                                                          | `json` \| `url-encoded`                      |
| tokenResponseParser                            | Some providers returns some non-standard token responses. Specifies how to parse the JSON response to get the access token         | `(response: unknown) => OAuth.TokenResponse` |
| tokenRefreshResponseParser                     | Some providers returns some non-standard refresh token responses. Specifies how to parse the JSON response to get the access token | `(response: unknown) => OAuth.TokenResponse` |

### ProviderOptions

| Property Name                                  | Description                                                                                                                        | Type                                         |
| ---------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------- |
| clientId<mark style="color:red;">\*</mark>     | The app's client ID                                                                                                                | `string`                                     |
| scope<mark style="color:red;">\*</mark>        | The scope of the access requested from the provider                                                                                | `string` \| `Array<string>`                  |
| authorizeUrl<mark style="color:red;">\*</mark> | The URL to start the OAuth flow                                                                                                    | `string`                                     |
| tokenUrl<mark style="color:red;">\*</mark>     | The URL to exchange the authorization code for an access token                                                                     | `string`                                     |
| refreshTokenUrl                                | The URL to refresh the access token if applicable                                                                                  | `string`                                     |
| personalAccessToken                            | A personal token if the provider supports it                                                                                       | `string`                                     |
| onAuthorize                                    | A callback function that is called once the user has been properly logged in through OAuth when used with `withAccessToken`        | `string`                                     |
| bodyEncoding                                   | Specifies the format for sending the body of the request.                                                                          | `json` \| `url-encoded`                      |
| tokenResponseParser                            | Some providers returns some non-standard token responses. Specifies how to parse the JSON response to get the access token         | `(response: unknown) => OAuth.TokenResponse` |
| tokenRefreshResponseParser                     | Some providers returns some non-standard refresh token responses. Specifies how to parse the JSON response to get the access token | `(response: unknown) => OAuth.TokenResponse` |

### ProviderWithDefaultClientOptions

| Property Name                           | Description                                                                                                                        | Type                                         |
| --------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------- |
| scope<mark style="color:red;">\*</mark> | The scope of the access requested from the provider                                                                                | `string` \| `Array<string>`                  |
| clientId                                | The app's client ID                                                                                                                | `string`                                     |
| authorizeUrl                            | The URL to start the OAuth flow                                                                                                    | `string`                                     |
| tokenUrl                                | The URL to exchange the authorization code for an access token                                                                     | `string`                                     |
| refreshTokenUrl                         | The URL to refresh the access token if applicable                                                                                  | `string`                                     |
| personalAccessToken                     | A personal token if the provider supports it                                                                                       | `string`                                     |
| onAuthorize                             | A callback function that is called once the user has been properly logged in through OAuth when used with `withAccessToken`        | `string`                                     |
| bodyEncoding                            | Specifies the format for sending the body of the request.                                                                          | `json` \| `url-encoded`                      |
| tokenResponseParser                     | Some providers returns some non-standard token responses. Specifies how to parse the JSON response to get the access token         | `(response: unknown) => OAuth.TokenResponse` |
| tokenRefreshResponseParser              | Some providers returns some non-standard refresh token responses. Specifies how to parse the JSON response to get the access token | `(response: unknown) => OAuth.TokenResponse` |
