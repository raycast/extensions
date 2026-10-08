import { Action, ActionPanel, Form, launchCommand, LaunchProps, LaunchType, showToast, Toast } from "@raycast/api";
import { useEffect, useState } from "react";
import { execAPWCommand } from "./utils";

export default function Command(props: LaunchProps<{ launchContext: { returnUrl?: string } }>) {
  const [ready, setReady] = useState(false);

  // Trigger the challenge on open; macOS then displays the PIN to enter below.
  useEffect(() => {
    (async () => {
      try {
        await execAPWCommand(["auth", "request"]);
        await showToast({
          style: Toast.Style.Success,
          title: "Enter the PIN shown by macOS",
        });
      } catch (error) {
        console.error("Error starting authentication: ", error);
        await showToast({
          style: Toast.Style.Failure,
          title: "Could not start authentication",
          message: "Is the APW daemon running (`apw start`)?",
        });
      } finally {
        setReady(true);
      }
    })();
  }, []);

  const handleSubmit = async ({ vcode }: { vcode: string }) => {
    if (!vcode) {
      await showToast({ style: Toast.Style.Failure, title: "Enter the PIN" });
      return;
    }

    try {
      const result = await execAPWCommand(["auth", "response", `--pin=${vcode}`]);

      if (result.status === 0) {
        await showToast({ style: Toast.Style.Success, title: "Authenticated" });
        await launchCommand({
          name: "list",
          type: LaunchType.UserInitiated,
          arguments: props.launchContext?.returnUrl ? { url: props.launchContext.returnUrl } : {},
        });
      } else {
        throw new Error(result.error || "Authentication failed");
      }
    } catch (error) {
      console.error("Error during authentication: ", error);
      await showToast({
        style: Toast.Style.Failure,
        title: "Authentication failed",
      });
    }
  };

  return (
    <Form
      isLoading={!ready}
      actions={
        <ActionPanel>
          <Action.SubmitForm onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField id="vcode" title="PIN" placeholder="Enter the 6-digit PIN displayed by macOS" />
    </Form>
  );
}
