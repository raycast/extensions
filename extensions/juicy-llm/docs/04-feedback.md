# Feedback (Toast, HUD, Alert)

## Toast (showToast)

비동기 작업 상태 알림. 액션 버튼 추가 가능. Raycast 윈도우가 닫혀 있으면 `showHUD()`로 폴백.

### showToast

```tsx
async function showToast(options: Toast.Options): Promise<Toast>;
```

### Toast.Options

| Prop | Type | 설명 |
|------|------|------|
| `title`* | `string` | 상단 제목 |
| `message` | `string` | 추가 메시지 |
| `style` | `Toast.Style` | 스타일 |
| `primaryAction` | `Toast.ActionOptions` | 1차 액션 |
| `secondaryAction` | `Toast.ActionOptions` | 2차 액션 |

### Toast.Style

| 값 | 용도 |
|----|------|
| `Toast.Style.Animated` | 진행 중인 작업 (로딩) |
| `Toast.Style.Success` | 성공 확인 |
| `Toast.Style.Failure` | 에러 표시 |

### Toast 객체 메서드

| 메서드 | 설명 |
|--------|------|
| `show()` | Toast 표시 |
| `hide()` | Toast 숨기기 |

Toast 속성(`style`, `title`, `message`, `primaryAction`, `secondaryAction`)은 생성 후에도 업데이트 가능.

### Toast.ActionOptions

| Prop | Type | 설명 |
|------|------|------|
| `title`* | `string` | 액션 제목 |
| `onAction`* | `(toast: Toast) => void` | 실행 콜백 |
| `shortcut` | `Keyboard.Shortcut` | 단축키 |

### 예제

```tsx
import { showToast, Toast } from "@raycast/api";

// 간단한 성공 Toast
await showToast({ title: "Done!", style: Toast.Style.Success });

// 애니메이션 + 상태 업데이트
const toast = await showToast({ style: Toast.Style.Animated, title: "Uploading..." });
try {
  await uploadFile();
  toast.style = Toast.Style.Success;
  toast.title = "Upload complete";
} catch (err) {
  toast.style = Toast.Style.Failure;
  toast.title = "Upload failed";
  toast.message = err instanceof Error ? err.message : "Unknown error";
}

// 액션이 있는 Toast
await showToast({
  style: Toast.Style.Success,
  title: "Created",
  primaryAction: {
    title: "Open",
    onAction: (toast) => { console.log("open"); toast.hide(); },
  },
});
```

---

## HUD (showHUD)

간단한 확인 메시지. 메인 윈도우를 닫고 잠시 표시 후 자동 사라짐. no-view 커맨드에 적합.

```tsx
import { showHUD } from "@raycast/api";

await showHUD("Copied to clipboard!");
```

### Signature

```tsx
async function showHUD(title: string, options?: { clearRootSearch?: boolean; popToRootType?: PopToRootType }): Promise<void>;
```

---

## Alert (confirmAlert)

사용자 확인 대화상자.

```tsx
import { confirmAlert, Alert } from "@raycast/api";

const confirmed = await confirmAlert({
  title: "Are you sure?",
  message: "This action cannot be undone.",
  primaryAction: {
    title: "Delete",
    style: Alert.ActionStyle.Destructive,
  },
});

if (confirmed) {
  // 삭제 로직
}
```

### Alert.Options

| Prop | Type | 설명 |
|------|------|------|
| `title`* | `string` | 제목 |
| `message` | `string` | 메시지 |
| `icon` | `Image.ImageLike` | 아이콘 |
| `primaryAction` | `Alert.ActionOptions` | 1차 버튼 |
| `dismissAction` | `Alert.ActionOptions` | 취소 버튼 |
| `rememberUserChoice` | `boolean` | 사용자 선택 기억 |

### Alert.ActionStyle

| 값 | 설명 |
|----|------|
| `Default` | 기본 스타일 |
| `Destructive` | 파괴적 액션 (빨간색) |
| `Cancel` | 취소 |

---

## showFailureToast (@raycast/utils)

에러를 보기 좋게 Toast로 표시. `@raycast/utils`에서 제공.

```tsx
import { showFailureToast } from "@raycast/utils";

try {
  await riskyOperation();
} catch (error) {
  await showFailureToast(error, { title: "Operation failed" });
}
```

| Param | Type | 설명 |
|-------|------|------|
| `error` | `unknown` | 에러 객체 |
| `options.title` | `string` | 커스텀 제목 (기본: "Something went wrong") |
| `options.primaryAction` | `Toast.ActionOptions` | 1차 액션 |
