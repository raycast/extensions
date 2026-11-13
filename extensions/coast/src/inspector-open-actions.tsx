import { Action, Icon, open, showToast, Toast } from "@raycast/api";
import { createCoastLink, type CaptureDetail } from "./coast";

export function InspectorOpenActions({ capture }: { capture: CaptureDetail }) {
  return (
    <>
      <Action
        title="Open in Coast"
        icon={Icon.Clock}
        onAction={async () => {
          try {
            await open(await createCoastLink(capture.timestamp));
          } catch (error) {
            await showToast({
              style: Toast.Style.Failure,
              title: "Could Not Open in Coast",
              message: error instanceof Error ? error.message : String(error),
            });
          }
        }}
      />
      {capture.url ? (
        <Action.OpenInBrowser title="Open Original URL" url={capture.url} />
      ) : null}
    </>
  );
}
