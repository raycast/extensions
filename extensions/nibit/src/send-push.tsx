import { Action, ActionPanel, Form, Icon, LaunchProps, closeMainWindow, showToast, Toast } from "@raycast/api";
import { useCachedPromise, useForm } from "@raycast/utils";
import { useMemo } from "react";
import { getSharedClient } from "./lib/client";
import { InputLimits } from "./lib/inputLimits";
import { ensureSignedIn } from "./lib/oauth";

type FormValues = {
  content: string;
  title: string;
  targetDeviceId: string;
};

type SendPushArguments = {
  content?: string;
  title?: string;
};

export default function Command(props: LaunchProps<{ arguments: SendPushArguments }>) {
  const initialContent = props.arguments.content?.trim() ?? "";
  const initialTitle = props.arguments.title?.trim() ?? "";
  const { data: devices = [] } = useCachedPromise(async () => {
    const session = await ensureSignedIn();
    if (!session) return [];
    return getSharedClient().fetchSecureDevices();
  }, []);

  const dropdownItems = useMemo(
    () => [
      { title: "All Devices", value: "" },
      ...devices.map((device) => ({
        title: device.display_name ?? device.device_name,
        value: device.id,
      })),
    ],
    [devices],
  );

  const { handleSubmit, itemProps, values } = useForm<FormValues>({
    initialValues: {
      content: initialContent,
      title: initialTitle,
      targetDeviceId: "",
    },
    onSubmit: async (values) => {
      const session = await ensureSignedIn();
      if (!session) return;
      const result = await getSharedClient().sendSecurePushItem(values.content.trim(), {
        title: values.title.trim() || undefined,
        targetDeviceId: values.targetDeviceId || null,
        kind: /^https?:\/\//i.test(values.content.trim()) ? "url" : "text",
      });
      if (result.error) {
        await showToast({ style: Toast.Style.Failure, title: "Send failed", message: result.error });
        return;
      }
      await closeMainWindow();
      await showToast({ style: Toast.Style.Success, title: "Push sent" });
    },
    validation: {
      content: (value) => {
        if (!value?.trim()) return "Enter text or a URL to send.";
        if (value.length > InputLimits.PUSH_CONTENT)
          return `Content must be ${InputLimits.PUSH_CONTENT.toLocaleString()} characters or fewer.`;
      },
      title: (value) => {
        if (value && value.length > InputLimits.PUSH_TITLE)
          return `Title must be ${InputLimits.PUSH_TITLE} characters or fewer.`;
      },
    },
  });

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Send Push" icon={Icon.Airplane} onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextArea
        title="Content"
        placeholder="Type text or paste a URL"
        info={`${(values.content ?? "").length.toLocaleString()} / ${InputLimits.PUSH_CONTENT.toLocaleString()}`}
        {...itemProps.content}
      />
      <Form.TextField
        title="Title"
        placeholder="Optional"
        info={
          (values.title ?? "").length > 0
            ? `${(values.title ?? "").length.toLocaleString()} / ${InputLimits.PUSH_TITLE.toLocaleString()}`
            : undefined
        }
        {...itemProps.title}
      />
      <Form.Dropdown title="Target" {...itemProps.targetDeviceId}>
        {dropdownItems.map((item) => (
          <Form.Dropdown.Item key={item.value || "all"} value={item.value} title={item.title} />
        ))}
      </Form.Dropdown>
    </Form>
  );
}
