# Actions & ActionPanel

## ActionPanel

사용자가 수행할 수 있는 액션 목록. List.Item, Grid.Item, Detail 등에 `actions` prop으로 전달.

### Props

| Prop | Type | 설명 |
|------|------|------|
| `children` | `ActionPanel.Children` | Section 또는 Action |
| `title` | `string` | ActionPanel 제목 |

### 단축키 규칙

| 컨텍스트 | Primary | Secondary |
|----------|---------|-----------|
| List / Grid / Detail | `↵` (Enter) | `⌘↵` |
| Form | `⌘↵` | `⌘⇧↵` |

### ActionPanel.Section

액션을 시각적으로 그룹핑.

| Prop | Type | 설명 |
|------|------|------|
| `children` | `ActionPanel.Section.Children` | Action 요소 |
| `title` | `string` | 섹션 제목 |

### ActionPanel.Submenu

선택 시 하위 액션 목록으로 교체.

| Prop | Type | 설명 |
|------|------|------|
| `title`* | `string` | 서브메뉴 제목 |
| `children` | `React.ReactNode` | 하위 Action |
| `icon` | `Image.ImageLike` | 아이콘 |
| `shortcut` | `Keyboard.Shortcut` | 단축키 |
| `isLoading` | `boolean` | 로딩 표시 |
| `filtering` | `boolean \| { keepSectionOrder: boolean }` | 필터링 |
| `autoFocus` | `boolean` | 자동 포커스 |
| `onOpen` | `() => void` | 열림 콜백 |
| `onSearchTextChange` | `(text: string) => void` | 검색 변경 콜백 |
| `throttle` | `boolean` | 스로틀링 |

---

## Action (커스텀)

사용자 정의 액션.

### Props

| Prop | Type | 설명 |
|------|------|------|
| `title`* | `string` | 액션 제목 |
| `onAction` | `() => void` | 실행 콜백 |
| `icon` | `Image.ImageLike` | 아이콘 |
| `shortcut` | `Keyboard.Shortcut` | 단축키 |
| `style` | `Action.Style` | 스타일 (`Regular` \| `Destructive`) |
| `autoFocus` | `boolean` | 자동 포커스 |

---

## 빌트인 Actions

### Action.CopyToClipboard

클립보드에 복사 후 메인 윈도우 닫힘 + HUD 표시.

| Prop | Type | 설명 |
|------|------|------|
| `content`* | `string \| number \| Clipboard.Content` | 복사할 내용 |
| `title` | `string` | 제목 |
| `icon` | `Image.ImageLike` | 아이콘 |
| `shortcut` | `Keyboard.Shortcut` | 단축키 |
| `concealed` | `boolean` | 클립보드 히스토리 비공개 |
| `onCopy` | `(content) => void` | 복사 완료 콜백 |

### Action.Paste

프론트 앱에 붙여넣기. 메인 윈도우 닫힘.

| Prop | Type | 설명 |
|------|------|------|
| `content`* | `string \| number \| Clipboard.Content` | 붙여넣을 내용 |
| `title` | `string` | 제목 |
| `icon` | `Image.ImageLike` | 아이콘 |
| `shortcut` | `Keyboard.Shortcut` | 단축키 |
| `onPaste` | `(content) => void` | 붙여넣기 완료 콜백 |

### Action.OpenInBrowser

기본 브라우저에서 URL 열기. 메인 윈도우 닫힘.

| Prop | Type | 설명 |
|------|------|------|
| `url`* | `string` | URL |
| `title` | `string` | 제목 |
| `icon` | `Image.ImageLike` | 아이콘 |
| `shortcut` | `Keyboard.Shortcut` | 단축키 |
| `onOpen` | `(url: string) => void` | 열기 완료 콜백 |

### Action.Open

파일/폴더/URL을 지정 앱으로 열기.

| Prop | Type | 설명 |
|------|------|------|
| `target`* | `string` | 대상 경로/URL |
| `title`* | `string` | 제목 |
| `application` | `string \| Application` | 앱 지정 |
| `icon` | `Image.ImageLike` | 아이콘 |
| `shortcut` | `Keyboard.Shortcut` | 단축키 |
| `onOpen` | `(target: string) => void` | 열기 완료 콜백 |

### Action.OpenWith

앱 선택 서브메뉴를 표시하여 열기.

| Prop | Type | 설명 |
|------|------|------|
| `path`* | `string` | 대상 경로 |
| `title` | `string` | 제목 |
| `icon` | `Image.ImageLike` | 아이콘 |
| `shortcut` | `Keyboard.Shortcut` | 단축키 |
| `onOpen` | `(path: string) => void` | 열기 완료 콜백 |

### Action.ShowInFinder

Finder에서 파일/폴더 표시.

| Prop | Type | 설명 |
|------|------|------|
| `path`* | `string` | 경로 |
| `title` | `string` | 제목 |
| `icon` | `Image.ImageLike` | 아이콘 |
| `shortcut` | `Keyboard.Shortcut` | 단축키 |

### Action.Trash

파일/폴더를 휴지통으로 이동.

| Prop | Type | 설명 |
|------|------|------|
| `paths`* | `PathLike \| PathLike[]` | 경로 |
| `title` | `string` | 제목 |
| `icon` | `Image.ImageLike` | 아이콘 |
| `shortcut` | `Keyboard.Shortcut` | 단축키 |
| `onTrash` | `(paths) => void` | 삭제 완료 콜백 |

### Action.Push

네비게이션 스택에 새 뷰 push.

| Prop | Type | 설명 |
|------|------|------|
| `target`* | `React.ReactNode` | 대상 뷰 |
| `title`* | `string` | 제목 |
| `icon` | `Image.ImageLike` | 아이콘 |
| `shortcut` | `Keyboard.Shortcut` | 단축키 |
| `onPush` | `() => void` | push 콜백 |
| `onPop` | `() => void` | pop 콜백 |

### Action.SubmitForm

Form 제출 핸들러.

| Prop | Type | 설명 |
|------|------|------|
| `onSubmit`* | `(values: Values) => void \| boolean \| Promise<void \| boolean>` | 제출 콜백 |
| `title` | `string` | 제목 |
| `icon` | `Image.ImageLike` | 아이콘 |
| `shortcut` | `Keyboard.Shortcut` | 단축키 |

### Action.PickDate

날짜 선택 액션.

| Prop | Type | 설명 |
|------|------|------|
| `title`* | `string` | 제목 |
| `onChange`* | `(date: Date) => void` | 날짜 변경 콜백 |
| `type` | `Action.PickDate.Type` | `DateTime` \| `Date` |
| `min` | `Date` | 최소 날짜 |
| `max` | `Date` | 최대 날짜 |
| `shortcut` | `Keyboard.Shortcut` | 단축키 |

### Action.ToggleQuickLook

Quick Look 미리보기 토글. `quickLook` prop이 있는 List.Item/Grid.Item에서 사용.

### Action.CreateSnippet / Action.CreateQuicklink

Raycast의 스니펫/퀵링크 생성 화면으로 이동.

---

## 예제: 종합 ActionPanel

```tsx
import { ActionPanel, Action, List, Keyboard } from "@raycast/api";

function ItemActions({ item }: { item: { title: string; url: string } }) {
  return (
    <ActionPanel title={item.title}>
      <ActionPanel.Section title="Open">
        <Action.OpenInBrowser url={item.url} />
        <Action.OpenWith path={item.url} shortcut={Keyboard.Shortcut.Common.OpenWith} />
      </ActionPanel.Section>
      <ActionPanel.Section title="Copy">
        <Action.CopyToClipboard content={item.url} title="Copy URL" shortcut={Keyboard.Shortcut.Common.Copy} />
        <Action.CopyToClipboard content={item.title} title="Copy Title" shortcut={Keyboard.Shortcut.Common.CopyName} />
      </ActionPanel.Section>
      <ActionPanel.Section>
        <Action.Push title="Details" target={<Detail markdown={`# ${item.title}`} />} />
        <ActionPanel.Submenu title="More" icon={Icon.Ellipsis}>
          <Action title="Custom Action" onAction={() => console.log("custom")} />
        </ActionPanel.Submenu>
      </ActionPanel.Section>
    </ActionPanel>
  );
}
```
