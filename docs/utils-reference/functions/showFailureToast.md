# `showFailureToast`

Function that shows a failure [Toast](../../api-reference/feedback/toast.md) for a given Error.

## Signature

```ts
function showFailureToast(
  error: unknown,
  options?: {
    title?: string;
    primaryAction?: Toast.ActionOptions;
  },
): Promise<T>;
```

### Arguments

- `error` is the error to report.

With a few options:

- `options.title` is a string describing the action that failed. By default, `"Something went wrong"`
- `options.primaryAction` is a Toast [Action](../../api-reference/feedback/toast.md#toast.actionoptions).

### Return

Returns a [Toast](../../api-reference/feedback/toast.md).

## Example

```tsx
import { showHUD } from "@raycast/api";
import { runAppleScript, showFailureToast } from "@raycast/utils";

export default async function () {
  try {
    const res = await runAppleScript(
      `
      on run argv
        return "hello, " & item 1 of argv & "."
      end run
      `,
      ["world"],
    );
    await showHUD(res);
  } catch (error) {
    showFailureToast(error, { title: "Could not run AppleScript" });
  }
}
```
