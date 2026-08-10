import {
  Detail,
  ActionPanel,
  Action,
  showToast,
  Toast,
  Icon,
  Keyboard,
} from "@raycast/api";
import { useFetch } from "@raycast/utils";

interface NaasResponse {
  reason: string;
}

export default function Command() {
  // Stable live endpoint
  const { isLoading, data, revalidate, error } = useFetch<NaasResponse>(
    "https://naas.isalman.dev/no",
    {
      keepPreviousData: true,
    },
  );

  if (error) {
    showToast({
      style: Toast.Style.Failure,
      title: "Could not fetch 'No' reason",
      message: error.message,
    });
  }

  const markdown = isLoading
    ? "Fetching a great reason to say no..."
    : `## ${data?.reason || "No."}`;

  return (
    <Detail
      isLoading={isLoading}
      markdown={markdown}
      actions={
        <ActionPanel>
          <Action.CopyToClipboard
            title="Copy Reason"
            content={data?.reason || ""}
          />
          <Action
            title="Get Another No"
            icon={Icon.ArrowClockwise}
            onAction={() => revalidate()}
            shortcut={Keyboard.Shortcut.Common.Refresh}
          />
        </ActionPanel>
      }
    />
  );
}
