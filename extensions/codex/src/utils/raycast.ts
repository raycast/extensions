import { closeMainWindow, popToRoot, showToast, Toast } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";

export async function runNoViewActionWithFailureToast(
  failureTitle: string,
  action: () => Promise<void>,
): Promise<void> {
  try {
    await closeMainWindow();
    await action();
    await popToRoot();
  } catch (error) {
    await showFailureToast(error, { title: failureTitle });
  }
}

export async function revalidateWithToast(
  revalidate: () => Promise<unknown>,
  {
    successTitle,
    failureTitle,
  }: { successTitle: string; failureTitle: string },
): Promise<void> {
  try {
    // usePromise resolves with the error after showing its own failure toast,
    // so a returned Error means the reload failed and must not read as success.
    const result = await revalidate();
    if (result instanceof Error) {
      return;
    }
    await showToast({ style: Toast.Style.Success, title: successTitle });
  } catch (error) {
    await showFailureToast(error, { title: failureTitle });
  }
}

// useForm attaches a blur validator to every item, so a field the user has not
// reached yet reports an error the moment focus leaves it. Submit still
// validates every field and focuses the first failure.
export function validateOnSubmitOnly<T extends { onBlur?: unknown }>(
  itemProps: T,
): T {
  return { ...itemProps, onBlur: undefined };
}
