# `usePromise`

Hook which wraps an asynchronous function or a function that returns a Promise and returns the [AsyncState](#asyncstate) corresponding to the execution of the function.

{% hint style="info" %}
The function is assumed to be constant (eg. changing it won't trigger a revalidation).
{% endhint %}

## Signature

```ts
type Result<T> = `type of the returned value of the returned Promise`;

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
  },
): AsyncState<Result<T>> & {
  revalidate: () => void;
  mutate: MutatePromise<Result<T> | undefined>;
};
```

### Arguments

- `fn` is an asynchronous function or a function that returns a Promise.
- `args` is the array of arguments to pass to the function. Every time they change, the function will be executed again. You can omit the array if the function doesn't require any argument.

With a few options:

- `options.abortable` is a reference to an [`AbortController`](https://developer.mozilla.org/en-US/docs/Web/API/AbortController) to cancel a previous call when triggering a new one.
- `options.execute` is a boolean to indicate whether to actually execute the function or not. This is useful for cases where one of the function's arguments depends on something that might not be available right away (for example, depends on some user inputs). Because React requires every hook to be defined on the render, this flag enables you to define the hook right away but wait until you have all the arguments ready to execute the function.
- `options.onError` is a function called when an execution fails. By default, it will log the error and show a generic failure toast with an action to retry.
- `options.onData` is a function called when an execution succeeds.
- `options.onWillExecute` is a function called when an execution will start.
- `options.failureToastOptions` are the options to customize the title, message, and primary action of the failure toast.

### Returns

Returns an object with the [AsyncState](#asyncstate) corresponding to the execution of the function as well as a couple of methods to manipulate it.

- `data`, `error`, `isLoading` - see [AsyncState](#asyncstate).
- `revalidate` is a method to manually call the function with the same arguments again.
- `mutate` is a method to wrap an asynchronous update and gives some control about how the `usePromise`'s data should be updated while the update is going through. By default, the data will be revalidated (eg. the function will be called again) after the update is done. See [Mutation and Optimistic Updates](#mutation-and-optimistic-updates) for more information.

## Example

```tsx
import { Detail, ActionPanel, Action } from "@raycast/api";
import { usePromise } from "@raycast/utils";

export default function Command() {
  const abortable = useRef<AbortController>();
  const { isLoading, data, revalidate } = usePromise(
    async (url: string) => {
      const response = await fetch(url, { signal: abortable.current?.signal });
      const result = await response.text();
      return result;
    },
    ["https://api.example"],
    {
      abortable,
    },
  );

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

## Mutation and Optimistic Updates

In an optimistic update, the UI behaves as though a change was successfully completed before receiving confirmation from the server that it was - it is being optimistic that it will eventually get the confirmation rather than an error. This allows for a more responsive user experience.

You can specify an `optimisticUpdate` function to mutate the data in order to reflect the change introduced by the asynchronous update.

When doing so, you can specify a `rollbackOnError` function to mutate back the data if the asynchronous update fails. If not specified, the data will be automatically rolled back to its previous value (before the optimistic update).

```tsx
import { Detail, ActionPanel, Action, showToast, Toast } from "@raycast/api";
import { usePromise } from "@raycast/utils";

export default function Command() {
  const { isLoading, data, mutate } = usePromise(
    async (url: string) => {
      const response = await fetch(url);
      const result = await response.text();
      return result;
    },
    ["https://api.example"],
  );

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

The hook has built-in support for pagination. In order to enable pagination, `fn`'s type needs to change from

> an asynchronous function or a function that returns a Promise

to

> a function that returns an asynchronous function or a function that returns a Promise

In practice, this means going from

```ts
const { isLoading, data } = usePromise(
  async (searchText: string) => {
    const data = await getUser(); // or any asynchronous logic you need to perform
    return data;
  },
  [searchText],
);
```

to

```ts
const { isLoading, data, pagination } = usePromise(
  (searchText: string) =>
    async ({ page, lastItem, cursor }) => {
      const { data } = await getUsers(page); // or any other asynchronous logic you need to perform
      const hasMore = page < 50;
      return { data, hasMore };
    },
  [searchText],
);
```

or, if your data source uses cursor-based pagination, you can return a `cursor` alongside `data` and `hasMore`, and the cursor will be passed as an argument the next time the function gets called:

```ts
const { isLoading, data, pagination } = usePromise(
  (searchText: string) =>
    async ({ page, lastItem, cursor }) => {
      const { data, nextCursor } = await getUsers(cursor); // or any other asynchronous logic you need to perform
      const hasMore = nextCursor !== undefined;
      return { data, hasMore, cursor: nextCursor };
    },
  [searchText],
);
```

You'll notice that, in the second case, the hook returns an additional item: `pagination`. This can be passed to Raycast's `List` or `Grid` components in order to enable pagination.
Another thing to notice is that the async function receives a [PaginationOptions](#paginationoptions) argument, and returns a specific data format:

```ts
{
  data: any[];
  hasMore: boolean;
  cursor?: any;
}
```

Every time the promise resolves, the hook needs to figure out if it should paginate further, or if it should stop, and it uses `hasMore` for this.
In addition to this, the hook also needs `data`, and needs it to be an array, because internally it appends it to a list, thus making sure the `data` that the hook _returns_ always contains the data for all of the pages that have been loaded so far.
Additionally, you can also pass a `cursor` property, which will be included along with `page` and `lastItem` in the next pagination call.

### Full Example

```tsx
import { setTimeout } from "node:timers/promises";
import { useState } from "react";
import { List } from "@raycast/api";
import { usePromise } from "@raycast/utils";

export default function Command() {
  const [searchText, setSearchText] = useState("");

  const { isLoading, data, pagination } = usePromise(
    (searchText: string) => async (options: { page: number }) => {
      await setTimeout(200);
      const newData = Array.from({ length: 25 }, (_v, index) => ({
        index,
        page: options.page,
        text: searchText,
      }));
      return { data: newData, hasMore: options.page < 10 };
    },
    [searchText],
  );

  return (
    <List isLoading={isLoading} onSearchTextChange={setSearchText} pagination={pagination}>
      {data?.map((item) => (
        <List.Item
          key={`${item.page} ${item.index} ${item.text}`}
          title={`Page ${item.page} Item ${item.index}`}
          subtitle={item.text}
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

A method to wrap an asynchronous update and gives some control about how the `usePromise`'s data should be updated while the update is going through.

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

An object passed to a `PaginatedPromise`, it has two properties:

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
