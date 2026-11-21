# `getAccessToken`

Synchronous utility function for retrieving the OAuth or personal access token authorized by [`withAccessToken`](./withAccessToken.md). It can be called from components, event callbacks, and plain helper functions.

{% hint style="info" %}
The command **must** first be authenticated by [`withAccessToken`](./withAccessToken.md). Calling `getAccessToken` before authentication finishes throws an error.
{% endhint %}

## Signature

```tsx
function getAccessToken(): {
  token: string;
  type: "oauth" | "personal";
};
```

### Return

The function returns an object containing the following properties:

- `token`: A string representing the access token.
- `type`: Indicates the type of token retrieved. It is either `oauth` for OAuth tokens or `personal` for personal access tokens.

## Example

```tsx
import { Detail } from "@raycast/api";
import { authorize } from "./oauth";

function AuthorizedComponent() {
  const { token } = getAccessToken();
  return <Detail markdown={`Access token: ${token}`} />;
}

export default withAccessToken({ authorize })(AuthorizedComponent);
```
