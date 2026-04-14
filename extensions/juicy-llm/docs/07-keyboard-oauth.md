# Keyboard & OAuth

## Keyboard Shortcuts

Action에 단축키를 할당하여 마우스 없이 실행 가능. `Keyboard.Shortcut.Common` 사용 권장.

### Keyboard.Shortcut

```tsx
type Shortcut = {
  key: Keyboard.KeyEquivalent;
  modifiers: Keyboard.KeyModifier[];
};
```

### 사용 예

```tsx
import { Action, Keyboard } from "@raycast/api";

// 커스텀 단축키
<Action title="Refresh" shortcut={{ modifiers: ["cmd"], key: "r" }} onAction={() => {}} />

// Common 단축키
<Action title="Open" shortcut={Keyboard.Shortcut.Common.Open} onAction={() => {}} />
```

### 크로스 플랫폼 단축키

`cmd`, `ctrl`, `windows` 같은 모호한 modifier는 플랫폼별 지정 필요:

```tsx
<Action
  title="Copy"
  shortcut={{
    macOS: { modifiers: ["cmd", "shift"], key: "c" },
    Windows: { modifiers: ["ctrl", "shift"], key: "c" },
  }}
  onAction={() => {}}
/>
```

### Keyboard.Shortcut.Common

| 이름 | macOS | Windows |
|------|-------|---------|
| `Copy` | `⌘⇧C` | `Ctrl+Shift+C` |
| `CopyDeeplink` | `⌘⇧C` | `Ctrl+Shift+C` |
| `CopyName` | `⌘⇧.` | `Ctrl+Alt+C` |
| `CopyPath` | `⌘⇧,` | `Alt+Shift+C` |
| `Save` | `⌘S` | `Ctrl+S` |
| `Duplicate` | `⌘D` | `Ctrl+Shift+S` |
| `Edit` | `⌘E` | `Ctrl+E` |
| `MoveDown` | `⌘⇧↓` | `Ctrl+Shift+↓` |
| `MoveUp` | `⌘⇧↑` | `Ctrl+Shift+↑` |
| `New` | `⌘N` | `Ctrl+N` |
| `Open` | `⌘O` | `Ctrl+O` |
| `OpenWith` | `⌘⇧O` | `Ctrl+Shift+O` |
| `Pin` | `⌘⇧P` | `Ctrl+.` |
| `Refresh` | `⌘R` | `Ctrl+R` |
| `Remove` | `⌃X` | `Ctrl+D` |
| `RemoveAll` | `⌃⇧X` | `Ctrl+Shift+D` |
| `ToggleQuickLook` | `⌘Y` | `Ctrl+Y` |

### Keyboard.KeyModifier

`"cmd"` | `"ctrl"` | `"opt"` | `"shift"` | `"alt"` | `"windows"`

> `"alt"`과 `"opt"`은 동일 키 (macOS: opt, Windows: alt)

### Keyboard.KeyEquivalent

`"a"`-`"z"`, `"0"`-`"9"`, 기호(`.`, `,`, `/`, `[`, `]` 등), 특수키(`"return"`, `"delete"`, `"tab"`, `"arrowUp"`, `"arrowDown"`, `"arrowLeft"`, `"arrowRight"`, `"pageUp"`, `"pageDown"`, `"home"`, `"end"`, `"space"`, `"escape"`, `"enter"`, `"backspace"`)

---

## OAuth

`@raycast/utils`에서 제공하는 OAuth 인증 유틸리티. PKCE 기반.

### 3가지 구성요소

| 유틸리티 | 역할 |
|----------|------|
| `OAuthService` | OAuth 인증 서비스 정의 |
| `withAccessToken` | HOC로 컴포넌트에 인증 래핑 |
| `getAccessToken` | 현재 토큰 가져오기 |

### 빌트인 프로바이더

설정 없이 바로 사용 가능한 서비스:

```tsx
import { OAuthService } from "@raycast/utils";

// GitHub
const github = OAuthService.github({ scope: "notifications repo read:org" });

// Linear
const linear = OAuthService.linear({ scope: "read write" });

// Google (추가 설정 필요)
const google = OAuthService.google({ clientId: "...", scope: "..." });
```

### 빌트인 프로바이더 사용

```tsx
import { Detail, LaunchProps } from "@raycast/api";
import { withAccessToken, getAccessToken, OAuthService } from "@raycast/utils";

const github = OAuthService.github({
  scope: "notifications repo read:org read:user read:project",
});

function AuthorizedComponent(props: LaunchProps) {
  const { token } = getAccessToken();
  return <Detail markdown={`Access token: ${token}`} />;
}

export default withAccessToken(github)(AuthorizedComponent);
```

### 커스텀 프로바이더

```tsx
import { OAuth } from "@raycast/api";
import { OAuthService, withAccessToken, getAccessToken } from "@raycast/utils";

const client = new OAuth.PKCEClient({
  redirectMethod: OAuth.RedirectMethod.Web,
  providerName: "My Service",
  providerIcon: "provider_icon.png",
  providerId: "my-service",
  description: "Connect your account",
});

const provider = new OAuthService({
  client,
  clientId: "YOUR_CLIENT_ID",
  scope: "YOUR_SCOPES",
  authorizeUrl: "https://example.com/oauth/authorize",
  tokenUrl: "https://example.com/oauth/token",
});

export default withAccessToken(provider)(MyComponent);
```

### onAuthorize로 SDK 초기화

```tsx
import { OAuthService, withAccessToken } from "@raycast/utils";
import { LinearClient } from "@linear/sdk";

let linearClient: LinearClient | null = null;

export const linear = OAuthService.linear({
  scope: "read write",
  onAuthorize({ token }) {
    linearClient = new LinearClient({ accessToken: token });
  },
});

export function withLinearClient(Component: React.ComponentType) {
  return withAccessToken(linear)(Component);
}
```

### OAuth.PKCEClient

`@raycast/api`에서 제공하는 저수준 PKCE OAuth 클라이언트.

```tsx
import { OAuth } from "@raycast/api";

const client = new OAuth.PKCEClient({
  redirectMethod: OAuth.RedirectMethod.Web,  // Web | App | AppURI
  providerName: "My Service",
  providerIcon: "icon.png",
  providerId: "my-service",
  description: "Connect your account",
});
```

| RedirectMethod | 설명 |
|---------------|------|
| `Web` | 웹 리다이렉트 |
| `App` | Raycast 딥링크 |
| `AppURI` | 커스텀 URI 스킴 |
