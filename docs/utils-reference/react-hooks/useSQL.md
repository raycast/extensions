# `useSQL`

Hook which executes a query on a local SQL database and returns the [AsyncState](#asyncstate) corresponding to the execution of the query.

## Signature

```ts
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

### Arguments

- `databasePath` is the path to the local SQL database.
- `query` is the SQL query to run on the database.

With a few options:

- `options.permissionPriming` is a string explaining why the extension needs full disk access. For example, the Apple Notes extension uses `"This is required to search your Apple Notes."`. While it is optional, we recommend setting it to help users understand.

Including the [usePromise](./usePromise.md)'s options:

- `options.execute` is a boolean to indicate whether to actually execute the function or not. This is useful for cases where one of the function's arguments depends on something that might not be available right away (for example, depends on some user inputs). Because React requires every hook to be defined on the render, this flag enables you to define the hook right away but wait until you have all the arguments ready to execute the function.
- `options.onError` is a function called when an execution fails. By default, it will log the error and show a generic failure toast with an action to retry.
- `options.onData` is a function called when an execution succeeds.
- `options.onWillExecute` is a function called when an execution will start.
- `options.failureToastOptions` are the options to customize the title, message, and primary action of the failure toast.

### Return

Returns an object with the [AsyncState](#asyncstate) corresponding to the execution of the function as well as a couple of methods to manipulate it.

- `data`, `error`, `isLoading` - see [AsyncState](#asyncstate).
- `permissionView` is a React Node that should be returned when present. It will prompt users to grant full disk access (which is required for the hook to work).
- `revalidate` is a method to manually call the function with the same arguments again.
- `mutate` is a method to wrap an asynchronous update and gives some control over how the `useSQL`'s data should be updated while the update is going through. By default, the data will be revalidated (eg. the function will be called again) after the update is done. See [Mutation and Optimistic Updates](#mutation-and-optimistic-updates) for more information.

## Example

```tsx
import { useSQL } from "@raycast/utils";
import { resolve } from "path";
import { homedir } from "os";

const NOTES_DB = resolve(homedir(), "Library/Group Containers/group.com.apple.notes/NoteStore.sqlite");
const notesQuery = `SELECT id, title FROM ...`;
type NoteItem = {
  id: string;
  title: string;
};

export default function Command() {
  const { isLoading, data, permissionView } = useSQL<NoteItem>(NOTES_DB, notesQuery);

  if (permissionView) {
    return permissionView;
  }

  return (
    <List isLoading={isLoading}>
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
import { useSQL } from "@raycast/utils";

const NOTES_DB = resolve(homedir(), "Library/Group Containers/group.com.apple.notes/NoteStore.sqlite");
const notesQuery = `SELECT id, title FROM ...`;
type NoteItem = {
  id: string;
  title: string;
};

export default function Command() {
  const { isLoading, data, mutate, permissionView } = useFetch("https://api.example");

  if (permissionView) {
    return permissionView;
  }

  const createNewNote = async () => {
    const toast = await showToast({ style: Toast.Style.Animated, title: "Creating new Note" });
    try {
      await mutate(
        // we are calling an API to do something
        somehowCreateANewNote(),
        {
          // but we are going to do it on our local data right away,
          // without waiting for the call to return
          optimisticUpdate(data) {
            return data?.concat([{ id: "" + Math.random(), title: "New Title" }]);
          },
        },
      );
      // yay, the API call worked!
      toast.style = Toast.Style.Success;
      toast.title = "Note created";
    } catch (err) {
      // oh, the API call didn't work :(
      // the data will automatically be rolled back to its previous value
      toast.style = Toast.Style.Failure;
      toast.title = "Could not create Note";
      toast.message = err.message;
    }
  };

  return (
    <List isLoading={isLoading}>
      {(data || []).map((item) => (
        <List.Item
          key={item.id}
          title={item.title}
          actions={
            <ActionPanel>
              <Action title="Create new Note" onAction={() => createNewNote()} />
            </ActionPanel>
          }
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

A method to wrap an asynchronous update and gives some control about how the `useSQL`'s data should be updated while the update is going through.

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
