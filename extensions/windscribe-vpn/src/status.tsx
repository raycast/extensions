import { Action, ActionPanel, Detail, environment, Icon, open } from "@raycast/api";
import { showFailureToast, usePromise } from "@raycast/utils";
import { createWindscribe, findWindscribeApp, type Status, WindscribeError } from "./windscribe.ts";

const windscribe = createWindscribe(environment.supportPath);
const downloadUrl = "https://windscribe.com/download";
const stateTitles: Record<Status["state"], string> = {
  connected: "Connected",
  disconnected: "Disconnected",
  connecting: "Connecting",
  disconnecting: "Disconnecting",
  "signed-out": "Signed Out",
  "signing-in": "Signing In",
  failed: "Connection Error",
};

async function openWindscribe() {
  try {
    await open(await findWindscribeApp());
  } catch (error) {
    await showFailureToast(
      error instanceof WindscribeError ? error : new Error("Try opening Windscribe from Applications."),
      { title: "Could not open Windscribe" },
    );
  }
}

export default function Command() {
  const { data, error, isLoading, revalidate } = usePromise(windscribe.status, [], {
    onError: () => {
      // The view displays the error and a Refresh Status action.
    },
  });
  const failure = isLoading ? undefined : error;
  const status = isLoading || failure ? undefined : data;
  const title = status ? stateTitles[status.state] : failure ? "Status Unavailable" : "Checking Windscribe";
  const detail = failure
    ? failure instanceof WindscribeError
      ? failure.message
      : "Open Windscribe to check the VPN and try again."
    : status?.detail;

  return (
    <Detail
      isLoading={isLoading}
      markdown={`# ${title}`}
      metadata={
        status?.location || status?.protocol || detail ? (
          <Detail.Metadata>
            {status?.location && <Detail.Metadata.Label title="Location" text={status.location} />}
            {status?.protocol && <Detail.Metadata.Label title="Protocol" text={status.protocol} />}
            {detail && <Detail.Metadata.Label title="Details" text={detail} />}
          </Detail.Metadata>
        ) : undefined
      }
      actions={
        <ActionPanel>
          {!isLoading && <Action title="Refresh Status" icon={Icon.ArrowClockwise} onAction={revalidate} />}
          {failure instanceof WindscribeError && failure.code === "missing" ? (
            <Action.OpenInBrowser title="Download Windscribe" url={downloadUrl} />
          ) : (
            <Action title="Open Windscribe" icon={Icon.AppWindow} onAction={openWindscribe} />
          )}
        </ActionPanel>
      }
    />
  );
}
