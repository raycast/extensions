# Data APIs

## Clipboard

클립보드 읽기/쓰기/붙여넣기/삭제.

### Clipboard.copy

```tsx
async function copy(content: string | number | Clipboard.Content, options?: CopyOptions): Promise<void>;
```

```tsx
import { Clipboard } from "@raycast/api";

// 텍스트 복사
await Clipboard.copy("Hello World");

// 파일 복사
await Clipboard.copy({ file: "/path/to/file.pdf" });

// HTML 복사
await Clipboard.copy({ html: "<b>Bold</b>", text: "Bold" });

// 비밀 데이터 (클립보드 히스토리 미기록)
await Clipboard.copy("secret-token", { concealed: true });
```

### Clipboard.paste

```tsx
async function paste(content: string | Clipboard.Content): Promise<void>;
```

프론트 앱의 커서 위치에 텍스트 삽입.

### Clipboard.read

```tsx
async function read(options?: { offset?: number }): Promise<Clipboard.ReadContent>;
// offset: 0-5 (클립보드 히스토리 접근)
```

반환값: `{ text?: string; file?: string; html?: string }`

### Clipboard.readText

```tsx
async function readText(options?: { offset?: number }): Promise<string | undefined>;
```

### Clipboard.clear

```tsx
async function clear(): Promise<void>;
```

### Types

```tsx
// Clipboard.Content (쓰기용)
type Content =
  | { text: string }
  | { file: PathLike }
  | { html: string; text?: string };

// Clipboard.ReadContent (읽기용)
type ReadContent =
  | { text: string }
  | { file?: string }
  | { html?: string };

// Clipboard.CopyOptions
type CopyOptions = { concealed?: boolean };
```

---

## LocalStorage

영구 키-값 저장소. 확장 내 모든 커맨드에서 공유.

### API

```tsx
import { LocalStorage } from "@raycast/api";

// 저장 (string, number, boolean 지원)
await LocalStorage.setItem("key", "value");
await LocalStorage.setItem("count", 42);
await LocalStorage.setItem("enabled", true);

// 읽기
const value = await LocalStorage.getItem<string>("key");

// 전체 조회
const allItems = await LocalStorage.allItems();
// { key: "value", count: 42, enabled: true }

// 삭제
await LocalStorage.removeItem("key");

// 전체 삭제
await LocalStorage.clear();
```

---

## Cache

LRU 디스크 캐시. 동기 CRUD. 메모리에는 가벼운 인덱스만 유지, 실제 데이터는 디스크 저장. 기본 용량 10MB.

### 생성

```tsx
import { Cache } from "@raycast/api";

const cache = new Cache();
// 또는 네임스페이스 지정
const cache = new Cache({ namespace: "my-command", capacity: 5 * 1024 * 1024 });
```

### Cache.Options

| Prop | Type | 설명 |
|------|------|------|
| `capacity` | `number` | 용량 (bytes). 기본 10MB |
| `namespace` | `string` | 네임스페이스 (커맨드별 분리 시 사용) |

### Methods

```tsx
// CRUD
cache.set("key", JSON.stringify(data));     // 쓰기
const raw = cache.get("key");               // 읽기 (string | undefined)
const exists = cache.has("key");            // 존재 확인 (LRU 미갱신)
cache.remove("key");                         // 삭제
cache.clear();                               // 전체 삭제

// 속성
cache.isEmpty;                               // boolean

// 구독 (캐시 변경 알림)
const unsubscribe = cache.subscribe((key, data) => {
  console.log(`Cache updated: ${key}`);
});
unsubscribe(); // 구독 해제
```

### Types

```tsx
type Cache.Subscriber = (key: string | undefined, data: string | undefined) => void;
type Cache.Subscription = () => void;
```

---

## Environment

런타임 환경 정보 (읽기 전용).

```tsx
import { environment } from "@raycast/api";
```

### Properties

| Property | Type | 설명 |
|----------|------|------|
| `raycastVersion` | `string` | Raycast 버전 |
| `extensionName` | `string` | 확장 이름 |
| `commandName` | `string` | 커맨드 이름 |
| `commandMode` | `string` | 커맨드 모드 (view, no-view, menu-bar) |
| `assetsPath` | `string` | assets 디렉토리 경로 |
| `supportPath` | `string` | 확장 지원 디렉토리 경로 |
| `isDevelopment` | `boolean` | 개발 모드 여부 |
| `appearance` | `"dark" \| "light"` | Raycast 테마 |
| `textSize` | `"medium" \| "large"` | 텍스트 크기 |
| `launchType` | `LaunchType` | 실행 타입 (UserInitiated, Background) |
| `ownerOrAuthorName` | `string` | 확장 소유자/저자 |

### Functions

```tsx
// 기능 접근 확인
environment.canAccess(AI); // AI 접근 가능 여부

// Finder 선택 아이템
const items = await getSelectedFinderItems();

// 선택된 텍스트
const text = await getSelectedText();
```

---

## Preferences

확장/커맨드 설정값 접근. 설정은 `package.json`의 `preferences` 배열에서 정의.

```tsx
import { getPreferenceValues, openExtensionPreferences, openCommandPreferences } from "@raycast/api";

// 설정값 읽기
const prefs = getPreferenceValues<{ apiKey: string; theme: string }>();
console.log(prefs.apiKey);

// 설정 화면 열기
await openExtensionPreferences();
await openCommandPreferences();
```

### Preference 타입 매핑

| Form Control | Value Type |
|-------------|-----------|
| `textfield` | `string` |
| `password` | `string` |
| `checkbox` | `boolean` |
| `dropdown` | `string` |
| `appPicker` | `Application` |
| `file` | `string` |
| `directory` | `string` |

### 자동 생성 타입

Raycast는 `raycast-env.d.ts`에 `Preferences` 네임스페이스를 자동 생성. 수동 타입 정의 불필요.

```tsx
// raycast-env.d.ts (자동 생성)
declare namespace Preferences {
  export type MyCommand = ExtensionPreferences & {
    apiKey: string;
    theme: string;
  }
}
```
