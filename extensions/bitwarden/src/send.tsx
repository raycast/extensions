import { ActionPanel, Icon, Action, Form, showToast, Toast, Clipboard } from "@raycast/api";
import { useState } from "react";
import { Bitwarden } from "./api";
import { TroubleshootingGuide, UnlockForm } from "./components";
import { useSession } from "./search";
import { SendCreateOptions } from "./types";

export default function SendSecret() {
  try {
    const bitwardenApi = new Bitwarden();
    return <SendForm bitwardenApi={bitwardenApi} />;
  } catch {
    return <TroubleshootingGuide />;
  }
}

function SendForm({ bitwardenApi }: { bitwardenApi: Bitwarden }) {
  const tomorrowDate = new Date();
  tomorrowDate.setDate(tomorrowDate.getDate() + 1);
  tomorrowDate.setHours(12);
  tomorrowDate.setMinutes(0);

  return (
    <Form
      actions={
        <ActionPanel>
          <ShareSecretAction bitwardenApi={bitwardenApi} />
        </ActionPanel>
      }
    >
      <Form.TextField id="name" title="Secret Name" placeholder="Optional Send name" />
      <Form.TextArea id="secret" title="Secret" placeholder="Enter sensitive data to securely share..." />
      <Form.DatePicker id="deletionDate" title="Deletion Date" defaultValue={tomorrowDate} />
      <Form.Dropdown id="maxAccessCount" title="Maximum Access Count" storeValue>
        <Form.Dropdown.Item value="1" title="1 View" />
        <Form.Dropdown.Item value="2" title="2 Views" />
        <Form.Dropdown.Item value="3" title="3 Views" />
        <Form.Dropdown.Item value="5" title="5 Views" />
        <Form.Dropdown.Item value="10" title="10 Views" />
        <Form.Dropdown.Item value="20" title="20 Views" />
        <Form.Dropdown.Item value="50" title="50 Views" />
        <Form.Dropdown.Item value="-1" title="Unlimited Views" />
      </Form.Dropdown>
    </Form>
  );
}

function ShareSecretAction({ bitwardenApi }: { bitwardenApi: Bitwarden }) {
  const session = useSession();
  const [isLocked, setIsLocked] = useState<boolean>(false);

  async function createSend(options: SendCreateOptions, sessionToken: string) {
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: "Creating send",
    });

    try {
      const result = await bitwardenApi.createSend(options, sessionToken);

      await Clipboard.copy(result.accessUrl);

      toast.style = Toast.Style.Success;
      toast.title = "Send created";
      toast.message = "Copied link to clipboard";
    } catch (error) {
      setIsLocked(true);
      toast.style = Toast.Style.Failure;
      toast.title = "Failed to create send";
      toast.message = String(error);
    }
  }

  async function handleSubmit({
    name,
    secret,
    deletionDate,
    maxAccessCount,
  }: {
    name: string;
    secret: string;
    deletionDate: string;
    maxAccessCount: string;
  }) {
    if (!secret) {
      showToast({
        style: Toast.Style.Failure,
        title: "Secret is required",
      });
      return;
    }

    const token = session.token;
    if (!session.active) {
      return;
    }
    if (!token) {
      setIsLocked(true);
    } else {
      createSend(
        {
          name,
          text: { text: secret, hidden: false },
          deletionDate,
          maxAccessCount: parseInt(maxAccessCount) || undefined,
        },
        token
      );
    }
  }

  if (isLocked) {
    return (
      <UnlockForm
        bitwardenApi={bitwardenApi}
        onUnlock={async (token) => {
          await session.setToken(token);
          setIsLocked(false);
        }}
      />
    );
  }

  return <Action.SubmitForm icon={Icon.Upload} title="Create Bitwarden Send" onSubmit={handleSubmit} />;
}
