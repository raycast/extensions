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
      onError: (fetchError) => {
        showToast({
          style: Toast.Style.Failure,
          title: "Could not fetch 'No' reason",
          message: fetchError.message,
          primaryAction: {
            title: "Try Again",
            onAction: (toast) => {
              toast.hide();
              revalidate();
            },
          },
        });
      },
    },
  );

  const reason = data?.reason;

  let markdown: string;
  if (reason) {
    markdown = `## ${reason}`;
  } else if (error) {
    markdown = `## Could not fetch a reason\n\n${error.message}\n\nPress Enter to try again.`;
  } else {
    markdown = "Fetching a great reason to say no...";
  }

  const getAnother = (
    <Action
      title="Get Another No"
      icon={Icon.ArrowClockwise}
      onAction={() => revalidate()}
      shortcut={Keyboard.Shortcut.Common.Refresh}
    />
  );

  return (
    <Detail
      isLoading={isLoading}
      markdown={markdown}
      actions={
        <ActionPanel>
          {reason ? (
            <>
              <Action.CopyToClipboard title="Copy Reason" content={reason} />
              <Action.Paste title="Paste Reason" content={reason} />
              {getAnother}
            </>
          ) : (
            getAnother
          )}
        </ActionPanel>
      }
    />
  );
}
