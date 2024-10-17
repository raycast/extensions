import { Detail, ActionPanel, Action } from "@raycast/api";
import { useNavigation } from "@raycast/api";

export default function ErrorView({
  error,
}: {
  error?: {
    message: string;
    name: string;
  };
}) {
  const { pop } = useNavigation();

  const errorMessage = error?.message || "An unexpected error occurred";
  const errorName = error?.name || "UNKNOWN_ERROR";

  const markdown = `
# ❌ Oops! Something Went Wrong

We encountered an error while processing your request. Here are the details:

---

## Error Information
- **Message**: ${errorMessage}
- **Code**: ${errorName}

---

## What to do next?
1. **Try again**: The issue might be temporary. Refresh the view or restart the extension.
2. **Check your connection**: Ensure you have a stable internet connection.
3. **Update the extension**: Make sure you're using the latest version of this extension.
4. **Report the bug**: If the problem persists, please report it to the extension developer.

---

Don't worry! We're here to help. If you need further assistance, please don't hesitate to reach out.

  `;

  return (
    <Detail
      markdown={markdown}
      actions={
        <ActionPanel>
          <Action title="Go Back" onAction={pop} />
        </ActionPanel>
      }
    />
  );
}
