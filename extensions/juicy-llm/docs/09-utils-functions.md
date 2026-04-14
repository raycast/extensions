# @raycast/utils - Utility Functions

`@raycast/utils`에서 제공하는 유틸리티 함수들.

---

## showFailureToast

에러를 Failure Toast로 표시.

### Signature

```tsx
function showFailureToast(
  error: unknown,
  options?: {
    title?: string;                          // 기본: "Something went wrong"
    primaryAction?: Toast.ActionOptions;
  }
): Promise<Toast>;
```

### 예제

```tsx
import { showFailureToast } from "@raycast/utils";

try {
  await riskyOperation();
} catch (error) {
  await showFailureToast(error, { title: "Operation failed" });
}
```

---

## getAvatarIcon

이니셜 기반 컬러 아바타 아이콘 생성.

### Signature

```tsx
function getAvatarIcon(
  name: string,
  options?: {
    background?: string;  // HEX 색상 (기본: 이름 기반 랜덤)
    gradient?: boolean;    // 그라데이션 (기본: true)
  }
): Image.Asset;
```

### 예제

```tsx
import { List } from "@raycast/api";
import { getAvatarIcon } from "@raycast/utils";

export default function Command() {
  return (
    <List>
      <List.Item title="John Doe" icon={getAvatarIcon("John Doe")} />
      <List.Item title="Custom" icon={getAvatarIcon("Jane", { background: "#FF6600" })} />
    </List>
  );
}
```

---

## getProgressIcon

진행률 표시 아이콘 생성.

### Signature

```tsx
function getProgressIcon(
  progress: number,  // 0.0 ~ 1.0
  color?: Color.ColorLike
): Image.Asset;
```

### 예제

```tsx
import { List } from "@raycast/api";
import { getProgressIcon } from "@raycast/utils";

<List.Item
  title="Upload"
  icon={getProgressIcon(0.75)}
  accessories={[{ text: "75%" }]}
/>
```

---

## getFavicon

URL에서 파비콘 가져오기.

### Signature

```tsx
function getFavicon(
  url: string | URL,
  options?: {
    size?: number;     // 기본: 64
    fallback?: Image.ImageLike;
    mask?: Image.Mask;
  }
): Image.ImageLike;
```

### 예제

```tsx
import { List } from "@raycast/api";
import { getFavicon } from "@raycast/utils";

<List.Item
  title="Raycast"
  icon={getFavicon("https://raycast.com")}
/>

<List.Item
  title="GitHub"
  icon={getFavicon("https://github.com", { size: 128, mask: Image.Mask.RoundedRectangle })}
/>
```
