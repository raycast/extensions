import { Action, ActionPanel, Form, showHUD, showToast, Toast } from "@raycast/api";
import { useState } from "react";
import { dropboxCli } from "@/api";
import { async } from "dropbox/types/dropbox_types";

export default function Command() {
  const [loading, setLoading] = useState(false);
  return (
    <Form
      isLoading={loading}
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Submit"
            onSubmit={async (values) => {
              const url = values.url || "";
              const path = values.path || "";
              if (!url) {
                await showToast(Toast.Style.Failure, "URL is empty");
                return;
              }
              if (!url.startsWith("http")) {
                await showToast(Toast.Style.Failure, "URL must start with http");
                return;
              }

              let jobID = "";
              try {
                setLoading(true);
                const res = await dropboxCli.filesSaveUrl({ path, url });
                setLoading(false);
                console.log("save-url-res", res);
                jobID = (res.result as async.LaunchResultBaseAsyncJobId).async_job_id;
              } catch (e) {
                setLoading(false);
                console.error("save-url-error", e);
                // eslint-disable-next-line @typescript-eslint/ban-ts-comment
                // @ts-ignore
                await showToast(Toast.Style.Failure, `${e.error}`);
                return;
              }

              try {
                setLoading(true);
                for (;;) {
                  const res = await dropboxCli.filesSaveUrlCheckJobStatus({ async_job_id: jobID });
                  console.log("save-url-check-res", res);
                  //      failed: SaveUrlError;
                  if (res.result[".tag"] === "in_progress") {
                    await showToast(Toast.Style.Animated, "Save URL in progress");
                    await new Promise((resolve) => setTimeout(resolve, 1000));
                  } else if (res.result[".tag"] === "failed") {
                    await showToast(Toast.Style.Failure, `${res.result.failed}`);
                    break;
                  } else {
                    // complete
                    await showHUD("Save URL complete");
                    break;
                  }
                }
                setLoading(false);
              } catch (e) {
                setLoading(false);
                console.error("save-url-check-error", e);
                // eslint-disable-next-line @typescript-eslint/ban-ts-comment
                // @ts-ignore
                await showToast(Toast.Style.Failure, `${e.error}`);
                return;
              }
            }}
          />
        </ActionPanel>
      }
    >
      <Form.TextArea id="url" title="URL" />
      <Form.TextField id="path" title="Path" />
    </Form>
  );
}
