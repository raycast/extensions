# @raycast/utils - React Hooks

모든 훅은 `@raycast/utils`에서 import. `@raycast/api` peer dependency 필요.

```tsx
import { useFetch, useCachedPromise, useCachedState, usePromise, useForm, useExec, useSQL, useAI, useStreamJSON, useFrecencySorting } from "@raycast/utils";
```

---

## useFetch

URL을 fetch하고 결과를 캐싱. Stale-while-revalidate 전략. 페이지네이션 지원.

### Signature

```tsx
function useFetch<V, U, T = V>(
  url: RequestInfo,
  options?: RequestInit & {
    parseResponse?: (response: Response) => Promise<V>;
    mapResult?: (result: V) => { data: T; hasMore?: boolean; cursor?: string };
    initialData?: U;
    keepPreviousData?: boolean;
    execute?: boolean;
    onError?: (error: Error) => void;
    onData?: (data: T) => void;
    onWillExecute?: (args: [string, RequestInit]) => void;
    failureToastOptions?: Partial<Pick<Toast.Options, "title" | "primaryAction" | "message">>;
  }
): AsyncState<T> & {
  revalidate: () => void;
  mutate: MutatePromise<T | U | undefined>;
  pagination: Pagination;
};
```

### 예제

```tsx
import { List } from "@raycast/api";
import { useFetch } from "@raycast/utils";

export default function Command() {
  const { isLoading, data } = useFetch<{ items: string[] }>("https://api.example.com/items");
  return (
    <List isLoading={isLoading}>
      {data?.items.map((item, i) => <List.Item key={i} title={item} />)}
    </List>
  );
}
```

### 페이지네이션 예제

```tsx
const { isLoading, data, pagination } = useFetch(
  (options) => `https://api.example.com/items?page=${options.page + 1}&q=${searchText}`,
  {
    mapResult(result: { items: Item[]; totalPages: number }) {
      return { data: result.items, hasMore: result.page < result.totalPages };
    },
    keepPreviousData: true,
    initialData: [],
  }
);

return <List isLoading={isLoading} pagination={pagination}>{/* ... */}</List>;
```

---

## useCachedPromise

비동기 함수 결과를 캐싱. `useFetch`의 일반화 버전. Stale-while-revalidate.

### Signature

```tsx
function useCachedPromise<T, U>(
  fn: T,
  args?: Parameters<T>,
  options?: {
    initialData?: U;
    keepPreviousData?: boolean;
    abortable?: RefObject<AbortController | null | undefined>;
    execute?: boolean;
    onError?: (error: Error) => void;
    onData?: (data: Result<T>) => void;
    onWillExecute?: (args: Parameters<T>) => void;
    failureToastOptions?: Partial<Pick<Toast.Options, "title" | "primaryAction" | "message">>;
  }
): AsyncState<Result<T>> & {
  revalidate: () => void;
  mutate: MutatePromise<Result<T> | U>;
};
```

### 예제

```tsx
import { List } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";

async function fetchUsers(query: string) {
  const response = await fetch(`https://api.example.com/users?q=${query}`);
  return response.json();
}

export default function Command() {
  const [query, setQuery] = useState("");
  const { isLoading, data } = useCachedPromise(fetchUsers, [query]);

  return (
    <List isLoading={isLoading} onSearchTextChange={setQuery}>
      {data?.map((user) => <List.Item key={user.id} title={user.name} />)}
    </List>
  );
}
```

### Optimistic Update (mutate)

```tsx
const { data, mutate } = useCachedPromise(fetchItems);

async function addItem(newItem: Item) {
  await mutate(
    createItem(newItem), // 실제 API 호출
    {
      optimisticUpdate(currentData) {
        return [...(currentData || []), newItem]; // 즉시 UI 반영
      },
    }
  );
}
```

---

## useCachedState

커맨드 실행 간 상태 유지. `useState`와 유사하지만 값이 영속.

### Signature

```tsx
function useCachedState<T>(
  key: string,
  initialState?: T,
  config?: { cacheNamespace?: string }
): [T, (newState: T | ((prev: T) => T)) => void];
```

### 예제

```tsx
import { useCachedState } from "@raycast/utils";

export default function Command() {
  const [filter, setFilter] = useCachedState("filter", "all");
  // filter는 커맨드를 다시 열어도 유지됨
}
```

> JSON 직렬화 가능한 값만 지원. 동일 key를 쓰면 컴포넌트/커맨드 간 공유.

---

## usePromise

비동기 함수 래핑. `useCachedPromise`와 달리 **캐싱 없음**.

### Signature

```tsx
function usePromise<T>(
  fn: T,
  args?: Parameters<T>,
  options?: {
    abortable?: RefObject<AbortController | null | undefined>;
    execute?: boolean;
    onError?: (error: Error) => void;
    onData?: (data: Result<T>) => void;
    onWillExecute?: (args: Parameters<T>) => void;
    failureToastOptions?: Partial<Pick<Toast.Options, "title" | "primaryAction" | "message">>;
  }
): AsyncState<Result<T>> & {
  revalidate: () => void;
  mutate: MutatePromise<Result<T>>;
};
```

### 예제

```tsx
const { isLoading, data } = usePromise(
  async (searchText: string) => {
    const result = await fetchData(searchText);
    return result;
  },
  [searchText]
);
```

---

## useForm

폼 밸리데이션 + 제출 관리. `Form`과 함께 사용.

### Signature

```tsx
function useForm<T extends Form.Values>(options: {
  onSubmit: (values: T) => void | boolean | Promise<void | boolean>;
  initialValues?: Partial<T>;
  validation?: {
    [K in keyof T]?: FormValidation | ((value: T[K]) => string | undefined);
  };
}): {
  handleSubmit: (values: T) => void;
  itemProps: { [K in keyof T]: Form.ItemProps };
  values: T;
  setValue: (key: keyof T, value: T[keyof T]) => void;
  setValidationError: (key: keyof T, error: string) => void;
  focus: (key: keyof T) => void;
  reset: (initialValues?: Partial<T>) => void;
};
```

### FormValidation

| 값 | 설명 |
|----|------|
| `FormValidation.Required` | 필수 필드 |
| `(value) => string \| undefined` | 커스텀 밸리데이션 (에러 메시지 반환) |

### 예제

```tsx
import { Form, ActionPanel, Action } from "@raycast/api";
import { useForm, FormValidation } from "@raycast/utils";

interface Values { name: string; email: string }

export default function Command() {
  const { handleSubmit, itemProps } = useForm<Values>({
    onSubmit: (values) => console.log(values),
    validation: {
      name: FormValidation.Required,
      email: (v) => (!v?.includes("@") ? "Invalid email" : undefined),
    },
  });

  return (
    <Form actions={<ActionPanel><Action.SubmitForm onSubmit={handleSubmit} /></ActionPanel>}>
      <Form.TextField title="Name" {...itemProps.name} />
      <Form.TextField title="Email" {...itemProps.email} />
    </Form>
  );
}
```

---

## useExec

쉘 커맨드 실행. Stale-while-revalidate 캐싱.

### Signature

```tsx
function useExec(
  command: string,
  args?: string[],
  options?: {
    shell?: boolean | string;
    cwd?: string;
    env?: Record<string, string>;
    encoding?: string;
    input?: string;
    timeout?: number;
    parseOutput?: (output: { stdout: string; stderr: string; exitCode: number | null }) => T;
    initialData?: U;
    keepPreviousData?: boolean;
    execute?: boolean;
    onError?: (error: Error) => void;
    onData?: (data: T) => void;
    onWillExecute?: (args: string[]) => void;
    failureToastOptions?: Partial<Pick<Toast.Options, "title" | "primaryAction" | "message">>;
  }
): AsyncState<T> & {
  revalidate: () => void;
  mutate: MutatePromise<T | U>;
};
```

### 예제

```tsx
import { List } from "@raycast/api";
import { useExec } from "@raycast/utils";

const brewPath = cpus()[0].model.includes("Apple") ? "/opt/homebrew/bin/brew" : "/usr/local/bin/brew";

export default function Command() {
  const { isLoading, data } = useExec(brewPath, ["info", "--json=v2", "--installed"]);
  const results = useMemo(() => JSON.parse(data || "{}").formulae || [], [data]);

  return (
    <List isLoading={isLoading}>
      {results.map((item) => <List.Item key={item.id} title={item.name} />)}
    </List>
  );
}
```

---

## useSQL

로컬 SQL 데이터베이스 쿼리. 권한 프라이밍 UI 지원.

### Signature

```tsx
function useSQL<T>(
  databasePath: string,
  query: string,
  options?: {
    permissionPriming?: string;
    execute?: boolean;
    onError?: (error: Error) => void;
    onData?: (data: T) => void;
    onWillExecute?: (args: string[]) => void;
    failureToastOptions?: Partial<Pick<Toast.Options, "title" | "primaryAction" | "message">>;
  }
): AsyncState<T> & {
  revalidate: () => void;
  mutate: MutatePromise<T | U | undefined>;
  permissionView: React.ReactNode | undefined;
};
```

### 예제

```tsx
import { useSQL } from "@raycast/utils";

const DB_PATH = "/path/to/database.db";

export default function Command() {
  const { isLoading, data, permissionView } = useSQL<{ name: string }>(
    DB_PATH,
    "SELECT name FROM items ORDER BY name",
    { permissionPriming: "This extension needs access to your database." }
  );

  if (permissionView) return permissionView;

  return (
    <List isLoading={isLoading}>
      {data?.map((item, i) => <List.Item key={i} title={item.name} />)}
    </List>
  );
}
```

---

## useAI

Raycast AI 호출. React 컴포넌트에서 `AI.ask` 대신 사용.

### Signature

```tsx
function useAI(
  prompt: string,
  options?: {
    creativity?: AI.Creativity;
    model?: AI.Model;
    stream?: boolean;  // 기본 true
    execute?: boolean;
    onError?: (error: Error) => void;
    onData?: (data: string) => void;
    onWillExecute?: (args: any[]) => void;
    failureToastOptions?: Partial<Pick<Toast.Options, "title" | "primaryAction" | "message">>;
  }
): AsyncState<string> & {
  revalidate: () => void;
};
```

### 예제

```tsx
import { Detail } from "@raycast/api";
import { useAI } from "@raycast/utils";

export default function Command() {
  const { isLoading, data } = useAI("Explain TypeScript generics", {
    creativity: "low",
    stream: true,
  });

  return <Detail isLoading={isLoading} markdown={data || ""} />;
}
```

---

## useStreamJSON

대용량 JSON 스트리밍. 메모리에 전체 로드하지 않고 처리.

### Signature

```tsx
function useStreamJSON<T, U>(
  url: RequestInfo,
  options: RequestInit & {
    dataPath?: string;
    filter?: (item: T) => boolean;
    transform?: (item: any) => T;
    pageSize?: number;  // 기본 20
    initialData?: U;
    keepPreviousData?: boolean;
    execute?: boolean;
    onError?: (error: Error) => void;
    onData?: (data: T) => void;
    onWillExecute?: (args: [string, RequestInit]) => void;
    failureToastOptions?: Partial<Pick<Toast.Options, "title" | "primaryAction" | "message">>;
  }
): AsyncState<T[]> & {
  revalidate: () => void;
  pagination: Pagination;
};
```

> `http://`, `https://`, `file:///` URL 지원. `dataPath`로 중첩 배열 접근.

---

## useFrecencySorting

빈도(frequency) + 최근성(recency) 기반 정렬. 사용자가 자주 선택하는 아이템을 상위에 표시.

### Signature

```tsx
function useFrecencySorting<T>(
  data?: T[],
  options?: {
    namespace?: string;
    key?: (item: T) => string;  // 기본: item.id
    sortUnvisited?: (a: T, b: T) => number;
  }
): {
  data: T[];
  visitItem: (item: T) => Promise<void>;
  resetRanking: (item: T) => Promise<void>;
};
```

### 예제

```tsx
import { List, ActionPanel, Action, Icon } from "@raycast/api";
import { useFetch, useFrecencySorting } from "@raycast/utils";

export default function Command() {
  const { isLoading, data } = useFetch("https://api.example.com/items");
  const { data: sorted, visitItem, resetRanking } = useFrecencySorting(data);

  return (
    <List isLoading={isLoading}>
      {sorted.map((item) => (
        <List.Item
          key={item.id}
          title={item.title}
          actions={
            <ActionPanel>
              <Action.OpenInBrowser url={item.url} onOpen={() => visitItem(item)} />
              <Action title="Reset Ranking" icon={Icon.ArrowCounterClockwise} onAction={() => resetRanking(item)} />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
```

---

## AsyncState (공통 반환 타입)

모든 비동기 훅이 반환하는 상태 객체:

```tsx
type AsyncState<T> =
  | { isLoading: true; data?: T; error?: undefined }   // 로딩 중
  | { isLoading: false; data: T; error?: undefined }    // 성공
  | { isLoading: false; data?: undefined; error: Error }; // 에러
```
