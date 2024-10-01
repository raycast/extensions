import {
  Action,
  ActionPanel,
  Form,
  launchCommand,
  LaunchType,
  showToast,
  Toast,
  confirmAlert,
} from "@raycast/api";
import { useEffect, useState } from "react";
import { APWAuthRequest, APWMsg, execAPWCommand } from "./utils";

async function reauthenticate(): Promise<APWAuthRequest | null> {
  const confirmed = await confirmAlert({
    title: "Are you sure you wish to reauthenticate?",
    message: "This will remove the current authentication session.",
  });

  if (!confirmed) {
    console.log("Canceled reauthentication");
    return null;
  }

  try {
    return (await execAPWCommand(["auth", "request"])) as APWAuthRequest;
  } catch (error) {
    console.error("Error during reauthentication: ", error);
    await showToast({
      style: Toast.Style.Failure,
      title: "Reauthentication failed",
    });
    return null;
  }
}

export default function Command() {
  const [authData, setAuthData] = useState<APWAuthRequest | null>(null);

  useEffect(() => {
    (async () => {
      const data = await reauthenticate();
      setAuthData(data);
    })();
  }, []);

  const handleSubmit = async ({ vcode }: { vcode: string }) => {
    if (!authData) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Auth data not found",
      });
      return;
    }

    try {
      const result = (await execAPWCommand([
        "auth",
        "response",
        `--pin=${vcode}`,
        `--salt=${authData.salt}`,
        `--serverKey=${authData.serverKey}`,
        `--clientKey=${authData.clientKey}`,
        `--username=${authData.username}`,
      ])) as APWMsg;

      if (result.status === 0) {
        await showToast({
          style: Toast.Style.Success,
          title: "Verification successful",
        });
        await launchCommand({ name: "list", type: LaunchType.UserInitiated });
      } else {
        throw new Error("Verification failed");
      }
    } catch (error) {
      console.error("Error during verification: ", error);
      await showToast({
        style: Toast.Style.Failure,
        title: "Verification failed",
      });
    }
  };

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="vcode"
        title="Verification Code"
        placeholder="Enter the verification code displayed on screen"
      />
    </Form>
  );
}
