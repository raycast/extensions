import { Detail, ActionPanel, Action, showToast, Toast } from "@raycast/api";
import { useFetch } from "@raycast/utils";

interface NoResponse {
  reason?: string;
  error?: string;
}

export default function Command() {
  // Using the confirmed working API URL
  const { isLoading, data, revalidate } = useFetch<NoResponse>("https://naas.isalman.dev/no", {
    keepPreviousData: true,
    onError: (error) => {
      showToast({
        style: Toast.Style.Failure,
        title: "Rejection Failed",
        message: error.message,
      });
    },
  });

  // Display logic: Success Reason > API Error > Fallback
  const displayText = data?.reason || data?.error || (isLoading ? "Loading..." : "Something went wrong.");

  // Format the UI with a bit of style
  const markdown = `# No.
  
> ${displayText}`;

  return (
    <Detail
      isLoading={isLoading}
      markdown={markdown}
      actions={
        <ActionPanel>
          <Action
            title="Get Another No"
            onAction={() => revalidate()}
            shortcut={{ modifiers: ["cmd"], key: "r" }}
            icon={{ source: "arrow-clockwise.png" }}
          />
          {data?.reason && <Action.CopyToClipboard content={data.reason} title="Copy Reason" />}
        </ActionPanel>
      }
    />
  );
}
