# Navigation & Window

## Navigation

Raycast는 React Native와 유사한 스택 기반 네비게이션 사용. `Action.Push`로 뷰를 스택에 push, `useNavigation` 훅으로 프로그래밍 제어.

### useNavigation

```tsx
import { useNavigation } from "@raycast/api";

function MyComponent() {
  const { push, pop } = useNavigation();
  // push(<AnotherView />) - 새 뷰 push
  // pop() - 현재 뷰 pop
}
```

### Action.Push

선언적 네비게이션.

```tsx
<Action.Push title="Show Details" target={<DetailView />} />
```

| Prop | Type | 설명 |
|------|------|------|
| `target`* | `React.ReactNode` | 대상 뷰 |
| `title`* | `string` | 액션 제목 |
| `icon` | `Image.ImageLike` | 아이콘 |
| `shortcut` | `Keyboard.Shortcut` | 단축키 |
| `onPush` | `() => void` | push 콜백 |
| `onPop` | `() => void` | pop 시 콜백 |

---

## Window & Search Bar

### popToRoot

네비게이션 스택을 루트 검색으로 되돌리기.

```tsx
import { popToRoot } from "@raycast/api";

await popToRoot({ clearSearchBar: true });
```

| Option | Type | 설명 |
|--------|------|------|
| `clearSearchBar` | `boolean` | 검색바 텍스트 초기화 |

### closeMainWindow

메인 Raycast 윈도우 닫기.

```tsx
import { closeMainWindow, PopToRootType } from "@raycast/api";

// 기본 동작
await closeMainWindow({ clearRootSearch: true });

// Pop to Root 동작 제어
await closeMainWindow({ popToRootType: PopToRootType.Suspended });
```

| Option | Type | 설명 |
|--------|------|------|
| `clearRootSearch` | `boolean` | 루트 검색바 초기화 |
| `popToRootType` | `PopToRootType` | Pop to Root 동작 |

### PopToRootType

| 값 | 설명 |
|----|------|
| `Default` | 사용자 설정 따름 |
| `Immediate` | 즉시 루트로 |
| `Suspended` | Pop to Root 방지 |

### clearSearchBar

현재 검색바 텍스트 초기화.

```tsx
import { clearSearchBar } from "@raycast/api";

await clearSearchBar({ forceScrollToTop: true });
```

| Option | Type | 설명 |
|--------|------|------|
| `forceScrollToTop` | `boolean` | 상단 스크롤 강제 |

---

## 네비게이션 예제

```tsx
import { List, ActionPanel, Action, Detail, useNavigation } from "@raycast/api";

function ItemList() {
  return (
    <List>
      <List.Item
        title="View Details"
        actions={
          <ActionPanel>
            <Action.Push title="Open" target={<ItemDetail />} />
          </ActionPanel>
        }
      />
    </List>
  );
}

function ItemDetail() {
  const { pop } = useNavigation();
  return (
    <Detail
      markdown="# Detail View"
      actions={
        <ActionPanel>
          <Action title="Go Back" onAction={pop} />
        </ActionPanel>
      }
    />
  );
}
```
