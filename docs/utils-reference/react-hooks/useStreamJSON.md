# `useStreamJSON`

Hook which takes a `http://`, `https://` or `file:///` URL pointing to a JSON resource, caches it to the command's support folder, and streams through its content. Useful when dealing with large JSON arrays which would be too big to fit in the command's memory.

## Signature

```ts
export function useStreamJSON<T, U>(
  url: RequestInfo,
  options: RequestInit & {
    filter?: (item: T) => boolean;
    transform?: (item: any) => T;
    pageSize?: number;
    initialData?: U;
    keepPreviousData?: boolean;
    execute?: boolean;
    onError?: (error: Error) => void;
    onData?: (data: T) => void;
    onWillExecute?: (args: [string, RequestInit]) => void;
    failureToastOptions?: Partial<Pick<Toast.Options, "title" | "primaryAction" | "message">>;
  },
): AsyncState<Result<T>> & {
  revalidate: () => void;
};
```

### Arguments

- `url` - The [`RequestInfo`](https://github.com/nodejs/undici/blob/v5.7.0/types/fetch.d.ts#L12) describing the resource that needs to be fetched. Strings starting with `http://`, `https://` and `Request` objects will use `fetch`, while strings starting with `file:///` will be copied to the cache folder.

With a few options:

- `options` extends [`RequestInit`](https://github.com/nodejs/undici/blob/v5.7.0/types/fetch.d.ts#L103-L117) allowing you to specify a body, headers, etc. to apply to the request.
- `options.pageSize` the amount of items to fetch at a time. By default, 20 will be used
- `options.dataPath` is a string or regular expression informing the hook that the array (or arrays) of data you want to stream through is wrapped inside one or multiple objects, and it indicates the path it needs to take to get to it.
- `options.transform` is a function called with each top-level object encountered while streaming. If the function returns an array, the hook will end up streaming through its children, and each array item will be passed to `options.filter`. If the function returns something other than an array, _it_ will be passed to `options.filter`. Note that the hook will revalidate every time the filter function changes, so you need to use [useCallback](https://react.dev/reference/react/useCallback) to make sure it only changes when it needs to.
- `options.filter` is a function called with each object encountered while streaming. If it returns `true`, the object will be kept, otherwise it will be discarded. Note that the hook will revalidate every time the filter function changes, so you need to use [useCallback](https://react.dev/reference/react/useCallback) to make sure it only changes when it needs to.

Including the [useCachedPromise](./useCachedPromise.md)'s options:

- `options.keepPreviousData` is a boolean to tell the hook to keep the previous results instead of returning the initial value if there aren't any in the cache for the new arguments. This is particularly useful when used for data for a List to avoid flickering.

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
- `pagination` - the pagination object that Raycast [`List`s](https://developers.raycast.com/api-reference/user-interface/list#props) and [`Grid`s](https://developers.raycast.com/api-reference/user-interface/grid#props) expect.
- `revalidate` is a method to manually call the function with the same arguments again.
- `mutate` is a method to wrap an asynchronous update and gives some control over how the hook's data should be updated while the update is going through. By default, the data will be revalidated (eg. the function will be called again) after the update is done. See [Mutation and Optimistic Updates](#mutation-and-optimistic-updates) for more information.

## Example

```ts
import { Action, ActionPanel, List, environment } from "@raycast/api";
import { useStreamJSON } from "@raycast/utils";
import { join } from "path";
import { useCallback, useState } from "react";

type Formula = { name: string; desc?: string };

export default function Main(): React.JSX.Element {
  const [searchText, setSearchText] = useState("");

  const formulaFilter = useCallback(
    (item: Formula) => {
      if (!searchText) return true;
      return item.name.toLocaleLowerCase().includes(searchText);
    },
    [searchText],
  );

  const formulaTransform = useCallback((item: any): Formula => {
    return { name: item.name, desc: item.desc };
  }, []);

  const { data, isLoading, pagination } = useStreamJSON("https://formulae.brew.sh/api/formula.json", {
    initialData: [] as Formula[],
    pageSize: 20,
    filter: formulaFilter,
    transform: formulaTransform
  });

  return (
    <List isLoading={isLoading} pagination={pagination} onSearchTextChange={setSearchText}>
      <List.Section title="Formulae">
        {data.map((d) => (
          <List.Item key={d.name} title={d.name} subtitle={d.desc} />
        ))}
      </List.Section>
    </List>
  );
}
```

## Mutation and Optimistic Updates

In an optimistic update, the UI behaves as though a change was successfully completed before receiving confirmation from the server that it was - it is being optimistic that it will eventually get the confirmation rather than an error. This allows for a more responsive user experience.

You can specify an `optimisticUpdate` function to mutate the data in order to reflect the change introduced by the asynchronous update.

When doing so, you can specify a `rollbackOnError` function to mutate back the data if the asynchronous update fails. If not specified, the data will be automatically rolled back to its previous value (before the optimistic update).

```tsx
import { Action, ActionPanel, List, environment } from "@raycast/api";
import { useStreamJSON } from "@raycast/utils";
import { join } from "path";
import { useCallback, useState } from "react";
import { setTimeout } from "timers/promises";

type Formula = { name: string; desc?: string };

export default function Main(): React.JSX.Element {
  const [searchText, setSearchText] = useState("");

  const formulaFilter = useCallback(
    (item: Formula) => {
      if (!searchText) return true;
      return item.name.toLocaleLowerCase().includes(searchText);
    },
    [searchText],
  );

  const formulaTransform = useCallback((item: any): Formula => {
    return { name: item.name, desc: item.desc };
  }, []);

  const { data, isLoading, mutate, pagination } = useStreamJSON("https://formulae.brew.sh/api/formula.json", {
    initialData: [] as Formula[],
    pageSize: 20,
    filter: formulaFilter,
    transform: formulaTransform,
  });

  return (
    <List isLoading={isLoading} pagination={pagination} onSearchTextChange={setSearchText}>
      <List.Section title="Formulae">
        {data.map((d) => (
          <List.Item
            key={d.name}
            title={d.name}
            subtitle={d.desc}
            actions={
              <ActionPanel>
                <Action
                  title="Delete All Items But This One"
                  onAction={async () => {
                    mutate(setTimeout(1000), {
                      optimisticUpdate: () => {
                        return [d];
                      },
                    });
                  }}
                />
              </ActionPanel>
            }
          />
        ))}
      </List.Section>
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
