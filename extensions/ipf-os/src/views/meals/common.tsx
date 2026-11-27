import { Action, ActionPanel, Color, Icon, List, Toast, showToast } from "@raycast/api";
import { ApiError } from "../../lib/api/client";
import { describeError } from "../../lib/api/errors";

export function MealsError({ error, onRetry }: { error: Error; onRetry: () => void }) {
  const denied = error instanceof ApiError && error.status === 403;
  return (
    <List>
      <List.EmptyView
        icon={{ source: Icon.Warning, tintColor: Color.Orange }}
        title={denied ? "Meals access unavailable" : "Could not load Meals"}
        description={
          denied
            ? "Your account does not have access to this Meals operation. Contact your administrator."
            : error.message
        }
        actions={
          <ActionPanel>
            <Action title="Try Again" icon={Icon.ArrowClockwise} onAction={onRetry} />
          </ActionPanel>
        }
      />
    </List>
  );
}

export async function mealAction<T>(
  title: string,
  success: string | ((result: T) => string),
  action: () => Promise<T>,
  onSuccess: () => void,
): Promise<boolean> {
  const toast = await showToast({ style: Toast.Style.Animated, title });
  try {
    const result = await action();
    toast.style = Toast.Style.Success;
    toast.title = typeof success === "function" ? success(result) : success;
    onSuccess();
    return true;
  } catch (error) {
    toast.style = Toast.Style.Failure;
    toast.title = "Meals action failed";
    toast.message = describeError(error);
    return false;
  }
}
