# UI Components

## List

리스트 뷰. 여러 아이템을 표시하는 기본 UI. 빌트인 퍼지 검색, 섹션 그룹핑, 디테일 사이드패널 지원.

### Props

| Prop | Type | 설명 |
|------|------|------|
| `children` | `React.ReactNode` | List.Section 또는 List.Item |
| `actions` | `React.ReactNode` | 자식이 없을 때 표시할 ActionPanel |
| `filtering` | `boolean \| { keepSectionOrder: boolean }` | 빌트인 필터링 토글 |
| `isLoading` | `boolean` | 로딩 바 표시 |
| `isShowingDetail` | `boolean` | 우측 디테일 패널 표시 |
| `navigationTitle` | `string` | 뷰 타이틀 |
| `searchBarPlaceholder` | `string` | 검색바 플레이스홀더 |
| `searchText` | `string` | 검색바 텍스트 (프로그래밍 제어) |
| `onSearchTextChange` | `(text: string) => void` | 검색 텍스트 변경 콜백 |
| `onSelectionChange` | `(id: string) => void` | 아이템 선택 변경 콜백 |
| `searchBarAccessory` | `ReactElement<List.Dropdown.Props>` | 검색바 우측 드롭다운 |
| `pagination` | `{ hasMore: boolean; onLoadMore: () => void; pageSize: number }` | 페이지네이션 설정 |
| `throttle` | `boolean` | onSearchTextChange 스로틀링 |
| `selectedItemId` | `string` | 선택할 아이템 ID |

### List.Item Props

| Prop | Type | 설명 |
|------|------|------|
| `title` | `string \| { value: string; tooltip?: string }` | 아이템 제목 |
| `subtitle` | `string \| { value?: string; tooltip?: string }` | 부제목 |
| `icon` | `Image.ImageLike` | 아이콘 |
| `accessories` | `List.Item.Accessory[]` | 우측 액세서리 |
| `actions` | `React.ReactNode` | ActionPanel |
| `detail` | `React.ReactNode` | List.Item.Detail (isShowingDetail=true일 때) |
| `keywords` | `string[]` | 추가 검색 키워드 |
| `id` | `string` | 고유 ID |

### List.Item.Detail

리스트 아이템의 우측 디테일 패널. `isShowingDetail=true`일 때 표시.

| Prop | Type | 설명 |
|------|------|------|
| `markdown` | `string` | CommonMark 렌더링 |
| `metadata` | `React.ReactNode` | Detail.Metadata 컴포넌트 |
| `isLoading` | `boolean` | 로딩 상태 |

### List.Section

| Prop | Type | 설명 |
|------|------|------|
| `title` | `string` | 섹션 제목 |
| `subtitle` | `string` | 섹션 부제목 |
| `children` | `React.ReactNode` | List.Item 요소 |

### List.Dropdown

검색바 우측 필터 드롭다운. `List.Dropdown.Item`과 `List.Dropdown.Section` 포함.

### 예제

```tsx
import { List, ActionPanel, Action } from "@raycast/api";

export default function Command() {
  return (
    <List isShowingDetail>
      <List.Section title="Recent">
        <List.Item
          title="API Reference"
          subtitle="Raycast"
          accessories={[{ text: "Updated today" }]}
          detail={
            <List.Item.Detail markdown="# API Reference\n\nComplete documentation..." />
          }
          actions={
            <ActionPanel>
              <Action.OpenInBrowser url="https://developers.raycast.com" />
              <Action.CopyToClipboard content="https://developers.raycast.com" />
            </ActionPanel>
          }
        />
      </List.Section>
    </List>
  );
}
```

---

## Grid

이미지 중심의 그리드 뷰. List와 API가 유사하여 전환이 쉬움. `@raycast/api` v1.36.0+.

### Props

| Prop | Type | 설명 |
|------|------|------|
| `children` | `React.ReactNode` | Grid.Section 또는 Grid.Item |
| `columns` | `number` | 열 수 (1-8) |
| `aspectRatio` | `"1" \| "3/2" \| "2/3" \| "4/3" \| "3/4" \| "16/9" \| "9/16"` | 아이템 비율 |
| `fit` | `Grid.Fit` | 콘텐츠 맞춤 방식 (기본: "contain") |
| `inset` | `Grid.Inset` | 콘텐츠-테두리 간격 |
| `filtering` | `boolean \| { keepSectionOrder: boolean }` | 빌트인 필터링 |
| `isLoading` | `boolean` | 로딩 바 |
| `navigationTitle` | `string` | 뷰 타이틀 |
| `searchBarPlaceholder` | `string` | 검색바 플레이스홀더 |
| `searchText` | `string` | 검색바 텍스트 |
| `onSearchTextChange` | `(text: string) => void` | 검색 변경 콜백 |
| `onSelectionChange` | `(id: string) => void` | 선택 변경 콜백 |
| `searchBarAccessory` | `ReactElement<Grid.Dropdown.Props>` | 검색바 드롭다운 |
| `pagination` | `{ hasMore: boolean; onLoadMore: () => void; pageSize: number }` | 페이지네이션 |
| `selectedItemId` | `string` | 선택 아이템 ID |
| `throttle` | `boolean` | 스로틀링 |

### Grid.Item Props

| Prop | Type | 설명 |
|------|------|------|
| `content`* | `Image.ImageLike \| { color: Color.ColorLike } \| { tooltip: string; value: ... }` | 그리드 콘텐츠 (필수) |
| `title` | `string` | 하단 제목 |
| `subtitle` | `string` | 하단 부제목 |
| `accessory` | `Grid.Item.Accessory` | 하단 액세서리 |
| `actions` | `React.ReactNode` | ActionPanel |
| `keywords` | `string[]` | 추가 검색 키워드 |
| `id` | `string` | 고유 ID |
| `quickLook` | `{ name?: string; path: PathLike }` | Quick Look 미리보기 |

### Grid.Dropdown / Grid.Section / Grid.EmptyView

List의 대응 컴포넌트와 동일한 패턴.

### 예제

```tsx
import { Grid, ActionPanel, Action } from "@raycast/api";

export default function Command() {
  return (
    <Grid columns={4} aspectRatio="3/2" fit={Grid.Fit.Fill}>
      <Grid.Section title="Wallpapers">
        <Grid.Item
          content="https://example.com/image.jpg"
          title="Mountain"
          actions={
            <ActionPanel>
              <Action.Open title="Open" target="https://example.com/image.jpg" />
            </ActionPanel>
          }
        />
      </Grid.Section>
    </Grid>
  );
}
```

---

## Detail

CommonMark 마크다운 렌더링 + 메타데이터 사이드패널.

### Props

| Prop | Type | 설명 |
|------|------|------|
| `markdown` | `string` | CommonMark 문자열 |
| `metadata` | `React.ReactNode` | Detail.Metadata 컴포넌트 |
| `actions` | `React.ReactNode` | ActionPanel |
| `isLoading` | `boolean` | 로딩 바 |
| `navigationTitle` | `string` | 뷰 타이틀 |

### Detail.Metadata

우측 메타데이터 영역.

| 컴포넌트 | 설명 |
|----------|------|
| `Detail.Metadata.Label` | `title`, `text`, `icon` 속성 |
| `Detail.Metadata.Link` | `title`, `target`, `text` 속성 |
| `Detail.Metadata.TagList` | 태그 목록 (`TagList.Item`: `text`, `color`, `icon`) |
| `Detail.Metadata.Separator` | 구분선 |

### 예제

```tsx
import { Detail } from "@raycast/api";

export default function Command() {
  return (
    <Detail
      markdown="# Project Status\n\nEverything is running smoothly."
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Label title="Status" text="Active" />
          <Detail.Metadata.Link title="Docs" target="https://docs.example.com" text="Open" />
          <Detail.Metadata.Separator />
          <Detail.Metadata.TagList title="Tags">
            <Detail.Metadata.TagList.Item text="v2.0" color="#00ff00" />
            <Detail.Metadata.TagList.Item text="stable" color="#0088ff" />
          </Detail.Metadata.TagList>
        </Detail.Metadata>
      }
    />
  );
}
```

---

## Form

사용자 입력 수집. Controlled/Uncontrolled 모드, 밸리데이션, 드래프트 지원.

### Props

| Prop | Type | 설명 |
|------|------|------|
| `children` | `React.ReactNode` | Form 아이템들 |
| `actions` | `React.ReactNode` | ActionPanel (Action.SubmitForm 포함) |
| `isLoading` | `boolean` | 로딩 바 |
| `enableDrafts` | `boolean` | 드래프트 저장 활성화 |
| `navigationTitle` | `string` | 뷰 타이틀 |
| `searchBarAccessory` | `ReactElement<Form.LinkAccessory.Props>` | 우측 링크 |

### Form 아이템 종류

| 컴포넌트 | value 타입 | 설명 |
|----------|-----------|------|
| `Form.TextField` | `string` | 텍스트 입력 |
| `Form.PasswordField` | `string` | 비밀번호 입력 |
| `Form.TextArea` | `string` | 여러 줄 텍스트 (enableMarkdown 지원) |
| `Form.Checkbox` | `boolean` | 체크박스 (`label` 필수) |
| `Form.DatePicker` | `Date` | 날짜/시간 선택 (min, max 제한) |
| `Form.Dropdown` | `string` | 드롭다운 선택 |
| `Form.TagPicker` | `string[]` | 다중 태그 선택 |
| `Form.FilePicker` | `string[]` | 파일/폴더 선택 |
| `Form.Separator` | - | 구분선 |
| `Form.Description` | - | 설명 텍스트 |
| `Form.LinkAccessory` | - | 네비게이션 바 링크 |

### 공통 Form 아이템 Props

| Prop | Type | 설명 |
|------|------|------|
| `id`* | `string` | 고유 ID (필수) |
| `title` | `string` | 좌측 레이블 |
| `defaultValue` | varies | 기본값 |
| `value` | varies | 현재값 (controlled) |
| `error` | `string` | 에러 메시지 |
| `info` | `string` | 안내 메시지 |
| `placeholder` | `string` | 플레이스홀더 |
| `storeValue` | `boolean` | 제출 후 값 유지 |
| `autoFocus` | `boolean` | 자동 포커스 |
| `onChange` | `(newValue) => void` | 값 변경 콜백 |
| `onBlur` | `(event) => void` | 포커스 해제 콜백 |
| `onFocus` | `(event) => void` | 포커스 획득 콜백 |

### Imperative API

모든 Form 아이템은 `focus()`와 `reset()` 메서드 지원.

### Form.DatePicker.Type

| 값 | 설명 |
|----|------|
| `DateTime` | 날짜 + 시간 (기본) |
| `Date` | 날짜만 |

### 밸리데이션

`onBlur`에서 밸리데이션 수행, `error` prop으로 에러 표시. 에러가 있으면 `Action.SubmitForm`의 `onSubmit`이 트리거되지 않음. `useForm` 훅 사용 권장.

### 예제

```tsx
import { Action, ActionPanel, Form, showToast, Toast } from "@raycast/api";
import { useForm, FormValidation } from "@raycast/utils";

interface FormValues {
  name: string;
  email: string;
  message: string;
}

export default function Command() {
  const { handleSubmit, itemProps } = useForm<FormValues>({
    onSubmit(values) {
      showToast({ style: Toast.Style.Success, title: "Submitted!", message: values.name });
    },
    validation: {
      name: FormValidation.Required,
      email: (value) => {
        if (!value?.includes("@")) return "Invalid email";
      },
    },
  });

  return (
    <Form actions={<ActionPanel><Action.SubmitForm title="Submit" onSubmit={handleSubmit} /></ActionPanel>}>
      <Form.TextField title="Name" placeholder="Your name" {...itemProps.name} />
      <Form.TextField title="Email" placeholder="you@example.com" {...itemProps.email} />
      <Form.TextArea title="Message" enableMarkdown {...itemProps.message} />
    </Form>
  );
}
```

---

## MenuBarExtra

macOS 메뉴바에 아이콘/텍스트 표시. 백그라운드 리프레시 지원. **Windows 미지원.**

`package.json`에서 `"mode": "menu-bar"` 설정 필요.

### Props

| Prop | Type | 설명 |
|------|------|------|
| `title` | `string` | 메뉴바 텍스트 |
| `icon` | `Image.ImageLike` | 메뉴바 아이콘 |
| `tooltip` | `string` | 툴팁 |
| `isLoading` | `boolean` | 로딩 상태 |
| `children` | `React.ReactNode` | 메뉴 아이템 |

### MenuBarExtra.Item Props

| Prop | Type | 설명 |
|------|------|------|
| `title`* | `string` | 메뉴 아이템 제목 |
| `subtitle` | `string` | 부제목 |
| `icon` | `Image.ImageLike` | 아이콘 |
| `tooltip` | `string` | 툴팁 |
| `shortcut` | `Keyboard.Shortcut` | 단축키 |
| `onAction` | `(event: ActionEvent) => void` | 클릭 콜백 |

### MenuBarExtra.Submenu

| Prop | Type | 설명 |
|------|------|------|
| `title`* | `string` | 서브메뉴 제목 |
| `icon` | `Image.ImageLike` | 아이콘 |
| `children` | `React.ReactNode` | 메뉴 아이템 |

### MenuBarExtra.Section

| Prop | Type | 설명 |
|------|------|------|
| `title` | `string` | 섹션 제목 |
| `children` | `React.ReactNode` | 메뉴 아이템 |

### 라이프사이클

1. **Root Search에서 실행** - 직접 실행, `isLoading`이 false가 되면 언로드
2. **설정 간격으로 실행** - `interval` 설정 시 백그라운드 리프레시
3. **메뉴바 아이콘 클릭** - 메뉴 표시를 위해 리로드
4. **시스템 이벤트** - 깨어남, 네트워크 변경 시
5. **fallback 제거** - `null` 반환 시 아이콘 제거

### 예제

```tsx
import { MenuBarExtra } from "@raycast/api";

export default function Command() {
  return (
    <MenuBarExtra icon="icon.png" tooltip="My Status">
      <MenuBarExtra.Section title="Status">
        <MenuBarExtra.Item title="Online" icon="🟢" onAction={() => console.log("online")} />
        <MenuBarExtra.Item title="Away" icon="🟡" onAction={() => console.log("away")} />
      </MenuBarExtra.Section>
      <MenuBarExtra.Submenu title="More Options">
        <MenuBarExtra.Item title="Settings" onAction={() => console.log("settings")} />
      </MenuBarExtra.Submenu>
    </MenuBarExtra>
  );
}
```

### 백그라운드 리프레시 설정 (package.json)

```json
{
  "commands": [{
    "name": "status",
    "mode": "menu-bar",
    "interval": "10m"
  }]
}
```

`interval` 값: `"10s"`, `"30s"`, `"1m"`, `"5m"`, `"10m"`, `"15m"`, `"30m"`, `"1h"`, `"6h"`, `"12h"`, `"1d"`
