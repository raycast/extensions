# `useFetch`

Hook which fetches the URL and returns the [AsyncState](#asyncstate) corresponding to the execution of the fetch.

It follows the `stale-while-revalidate` cache invalidation strategy popularized by [HTTP RFC 5861](https://tools.ietf.org/html/rfc5861). `useFetch` first returns the data from cache (stale), then sends the request (revalidate), and finally comes with the up-to-date data again.

The last value will be kept between command runs.

## Signature

```ts
export function useFetch<V, U, T = V>(
  url: RequestInfo,
  options?: RequestInit & {
    parseResponse?: (response: Response) => Promise<V>;
    mapResult?: (result: V) => { data: T };
    initialData?: U;
    keepPreviousData?: boolean;
    execute?: boolean;
    onError?: (error: Error) => void;
    onData?: (data: T) => void;
    onWillExecute?: (args: [string, RequestInit]) => void;
    failureToastOptions?: Partial<Pick<Toast.Options, "title" | "primaryAction" | "message">>;
  },
): AsyncState<T> & {
  revalidate: () => void;
  mutate: MutatePromise<T | U | undefined>;
};
```

### Arguments

- `url` is the string representation of the URL to fetch.

With a few options:

- `options` extends [`RequestInit`](https://github.com/nodejs/undici/blob/v5.7.0/types/fetch.d.ts#L103-L117) allowing you to specify a body, headers, etc. to apply to the request.
- `options.parseResponse` is a function that accepts the Response as an argument and returns the data the hook will return. By default, the hook will return `response.json()` if the response has a JSON `Content-Type` header or `response.text()` otherwise.
- `options.mapResult` is an optional function that accepts whatever `options.parseResponse` returns as an argument, processes the response, and returns an object wrapping the result, i.e. `(response) => { return { data: response> } };`.

Including the [useCachedPromise](./useCachedPromise.md)'s options:

- `options.keepPreviousData` is a boolean to tell the hook to keep the previous results instead of returning the initial value if there aren't any in the cache for the new arguments. This is particularly useful when used for data for a List to avoid flickering. See [Argument dependent on List search text](#argument-dependent-on-list-search-text) for more information.

Including the [useCachedState](./useCachedState.md)'s options:

- `options.initialData` is the initial value of the state if there aren't any in the Cache yet.

Including the [usePromise](./usePromise.md)'s options:

- `options.execute` is a boolean to indicate whether to actually execute the function or not. This is useful for cases where one of the function's arguments depends on something that might not be available right away (for example, depends on some user inputs). Because React requires every hook to be defined on the render, this flag enables you to define the hook right away but wait until you have all the arguments ready to execute the function.
- `options.onError` is a function called when an execution fails. By default, it will log the error and show a generic failure toast with an action to retry.
- `options.onData` is a function called when an execution succeeds.
- `options.onWillExecute` is a function called when an execution will start.
- `options.failureToastOptions` are the options to customize the title, message, and primary action of the failure toast.

### Return

Returns an object with the [AsyncState](#asyncstate) corresponding to the execution of the fetch as well as a couple of methods to manipulate it.

- `data`, `error`, `isLoading` - see [AsyncState](#asyncstate).
- `revalidate` is a method to manually call the function with the same arguments again.
- `mutate` is a method to wrap an asynchronous update and gives some control over how the `useFetch`'s data should be updated while the update is going through. By default, the data will be revalidated (eg. the function will be called again) after the update is done. See [Mutation and Optimistic Updates](#mutation-and-optimistic-updates) for more information.

## Example

```tsx
import { Detail, ActionPanel, Action } from "@raycast/api";
import { useFetch } from "@raycast/utils";

export default function Command() {
  const { isLoading, data, revalidate } = useFetch("https://api.example");

  return (
    <Detail
      isLoading={isLoading}
      markdown={data}
      actions={
        <ActionPanel>
          <Action title="Reload" onAction={() => revalidate()} />
        </ActionPanel>
      }
    />
  );
}
```

## Argument dependent on List search text

By default, when an argument passed to the hook changes, the function will be executed again and the cache's value for those arguments will be returned immediately. This means that in the case of new arguments that haven't been used yet, the initial data will be returned.

This behaviour can cause some flickering (initial data -> fetched data -> arguments change -> initial data -> fetched data, etc.). To avoid that, we can set `keepPreviousData` to `true` and the hook will keep the latest fetched data if the cache is empty for the new arguments (initial data -> fetched data -> arguments change -> fetched data).

```tsx
import { useState } from "react";
import { List, ActionPanel, Action } from "@raycast/api";
import { useFetch } from "@raycast/utils";

export default function Command() {
  const [searchText, setSearchText] = useState("");
  const { isLoading, data } = useFetch(`https://api.example?q=${searchText}`, {
    // to make sure the screen isn't flickering when the searchText changes
    keepPreviousData: true,
  });

  return (
    <List isLoading={isLoading} searchText={searchText} onSearchTextChange={setSearchText} throttle>
      {(data || []).map((item) => (
        <List.Item key={item.id} title={item.title} />
      ))}
    </List>
  );
}
```

## Mutation and Optimistic Updates

In an optimistic update, the UI behaves as though a change was successfully completed before receiving confirmation from the server that it was - it is being optimistic that it will eventually get the confirmation rather than an error. This allows for a more responsive user experience.

You can specify an `optimisticUpdate` function to mutate the data in order to reflect the change introduced by the asynchronous update.

When doing so, you can specify a `rollbackOnError` function to mutate back the data if the asynchronous update fails. If not specified, the data will be automatically rolled back to its previous value (before the optimistic update).

```tsx
import { Detail, ActionPanel, Action, showToast, Toast } from "@raycast/api";
import { useFetch } from "@raycast/utils";

export default function Command() {
  const { isLoading, data, mutate } = useFetch("https://api.example");

  const appendFoo = async () => {
    const toast = await showToast({ style: Toast.Style.Animated, title: "Appending Foo" });
    try {
      await mutate(
        // we are calling an API to do something
        fetch("https://api.example/append-foo"),
        {
          // but we are going to do it on our local data right away,
          // without waiting for the call to return
          optimisticUpdate(data) {
            return data + "foo";
          },
        },
      );
      // yay, the API call worked!
      toast.style = Toast.Style.Success;
      toast.title = "Foo appended";
    } catch (err) {
      // oh, the API call didn't work :(
      // the data will automatically be rolled back to its previous value
      toast.style = Toast.Style.Failure;
      toast.title = "Could not append Foo";
      toast.message = err.message;
    }
  };

  return (
    <Detail
      isLoading={isLoading}
      markdown={data}
      actions={
        <ActionPanel>
          <Action title="Append Foo" onAction={() => appendFoo()} />
        </ActionPanel>
      }
    />
  );
}
```

## Pagination

{% hint style="info" %}
When paginating, the hook will only cache the result of the first page.
{% endhint %}

The hook has built-in support for pagination. In order to enable pagination, `url`s type needs to change from `RequestInfo` to a function that receives a [PaginationOptions](#paginationoptions) argument, and returns a `RequestInfo`.

In practice, this means going from

```ts
const { isLoading, data } = useFetch(
  "https://api.ycombinator.com/v0.1/companies?" + new URLSearchParams({ q: searchText }).toString(),
  {
    mapResult(result: SearchResult) {
      return {
        data: result.companies,
      };
    },
    keepPreviousData: true,
    initialData: [],
  },
);
```

to

```ts
const { isLoading, data, pagination } = useFetch(
  (options) =>
    "https://api.ycombinator.com/v0.1/companies?" +
    new URLSearchParams({ page: String(options.page + 1), q: searchText }).toString(),
  {
    mapResult(result: SearchResult) {
      return {
        data: result.companies,
        hasMore: result.page < result.totalPages,
      };
    },
    keepPreviousData: true,
    initialData: [],
  },
);
```

or, if your data source uses cursor-based pagination, you can return a `cursor` alongside `data` and `hasMore`, and the cursor will be passed as an argument the next time the function gets called:

```ts
const { isLoading, data, pagination } = useFetch(
  (options) =>
    "https://api.ycombinator.com/v0.1/companies?" +
    new URLSearchParams({ cursor: options.cursor, q: searchText }).toString(),
  {
    mapResult(result: SearchResult) {
      const { companies, nextCursor } = result;
      const hasMore = nextCursor !== undefined;
      return { data: companies, hasMore, cursor: nextCursor, };
    },
    keepPreviousData: true,
    initialData: [],
  },
);
```

You'll notice that, in the second case, the hook returns an additional item: `pagination`. This can be passed to Raycast's `List` or `Grid` components in order to enable pagination.
Another thing to notice is that `mapResult`, which is normally optional, is actually required when using pagination. Furthermore, its return type is

```ts
{
  data: any[],
  hasMore?: boolean;
  cursor?: any;
}
```

Every time the URL is fetched, the hook needs to figure out if it should paginate further, or if it should stop, and it uses the `hasMore` for this.
In addition to this, the hook also needs `data`, and needs it to be an array, because internally it appends it to a list, thus making sure the `data` that the hook _returns_ always contains the data for all of the pages that have been fetched so far.

### Full Example

```tsx
import { Icon, Image, List } from "@raycast/api";
import { useFetch } from "@raycast/utils";
import { useState } from "react";

type SearchResult = { companies: Company[]; page: number; totalPages: number };
type Company = { id: number; name: string; smallLogoUrl?: string };
export default function Command() {
  const [searchText, setSearchText] = useState("");
  const { isLoading, data, pagination } = useFetch(
    (options) =>
      "https://api.ycombinator.com/v0.1/companies?" +
      new URLSearchParams({ page: String(options.page + 1), q: searchText }).toString(),
    {
      mapResult(result: SearchResult) {
        return {
          data: result.companies,
          hasMore: result.page < result.totalPages,
        };
      },
      keepPreviousData: true,
      initialData: [],
    },
  );

  return (
    <List isLoading={isLoading} pagination={pagination} onSearchTextChange={setSearchText}>
      {data.map((company) => (
        <List.Item
          key={company.id}
          icon={{ source: company.smallLogoUrl ?? Icon.MinusCircle, mask: Image.Mask.RoundedRectangle }}
          title={company.name}
        />
      ))}
    </List>
  );
}
```

## Types

### AsyncState

An object corresponding to the execution state of the function.

```ts
// Initial State
{
  isLoading: true, // or `false` if `options.execute` is `false`
  data: undefined,
  error: undefined
}

// Success State
{
  isLoading: false,
  data: T,
  error: undefined
}

// Error State
{
  isLoading: false,
  data: undefined,
  error: Error
}

// Reloading State
{
  isLoading: true,
  data: T | undefined,
  error: Error | undefined
}
```

### MutatePromise

A method to wrap an asynchronous update and gives some control about how the `useFetch`'s data should be updated while the update is going through.

```ts
export type MutatePromise<T> = (
  asyncUpdate?: Promise<any>,
  options?: {
    optimisticUpdate?: (data: T) => T;
    rollbackOnError?: boolean | ((data: T) => T);
    shouldRevalidateAfter?: boolean;
  },
) => Promise<any>;
```

### PaginationOptions

An object passed to a `PaginatedRequestInfo`, it has two properties:

- `page`: 0-indexed, this it's incremented every time the promise resolves, and is reset whenever `revalidate()` is called.
- `lastItem`: this is a copy of the last item in the `data` array from the last time the promise was executed. Provided for APIs that implement cursor-based pagination.
- `cursor`: this is the `cursor` property returned after the previous execution of `PaginatedPromise`. Useful when working with APIs that provide the next cursor explicitly.

```ts
export type PaginationOptions<T = any> = {
  page: number;
  lastItem?: T;
  cursor?: any;
};
```
