import { Form, ActionPanel, Action, showToast, Toast, Icon, open, Clipboard } from "@raycast/api";
import { useState } from "react";
import { CreateDraftValues } from "./types";
import { FormValidation, useForm } from "@raycast/utils";
import { createDraft } from "./typefully";

export default function Command() {
  const [shareOptions, setShareOptions] = useState<string>();
  const { handleSubmit, reset, focus, itemProps } = useForm<CreateDraftValues>({
    onSubmit: async (values) => {
      await showToast({
        style: Toast.Style.Animated,
        title: "Creating draft",
      });

      try {
        const draft = await createDraft(values);

        reset({
          content: "",
        });

        focus("content");

        await showToast({
          style: Toast.Style.Success,
          title: "Created draft",
          primaryAction: {
            title: "Open Draft",
            shortcut: { modifiers: ["cmd", "shift"], key: "o" },
            onAction: async (toast) => {
              await toast.hide();
              await open(`https://typefully.com/?d=${draft.id}`);
            },
          },
          secondaryAction: {
            title: "Copy Draft URL",
            shortcut: { modifiers: ["cmd", "shift"], key: "c" },
            onAction: async (toast) => {
              await toast.hide();
              await Clipboard.copy(`https://typefully.com/?d=${draft.id}`);
            },
          },
        });
      } catch (error) {
        await showToast({
          style: Toast.Style.Failure,
          title: "Failed creating draft",
          message: error instanceof Error ? error.message : String(error),
        });
      }
    },
    validation: {
      content: FormValidation.Required,
      scheduleDate: shareOptions === "schedule" ? FormValidation.Required : undefined,
    },
  });

  function handleScheduleChange(value: string) {
    setShareOptions(value);

    if (itemProps.shareOptions.onChange) {
      itemProps.shareOptions.onChange(value);
    }
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Create Draft" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextArea title="Content" placeholder="Craft your next communication" autoFocus {...itemProps.content} />
      <Form.Checkbox label="Split long threads into multiple tweets" {...itemProps.threadify} />
      <Form.Separator />
      <Form.Dropdown title="Schedule" {...itemProps.shareOptions} onChange={handleScheduleChange}>
        <Form.Dropdown.Item icon={Icon.Circle} value="none" title="None" />
        <Form.Dropdown.Item icon={Icon.ArrowRightCircle} value="next-free-slot" title="Next free slot" />
        <Form.Dropdown.Item icon={Icon.Clock} value="schedule" title="Find slot" />
      </Form.Dropdown>
      {shareOptions == "schedule" && (
        <Form.DatePicker type={Form.DatePicker.Type.DateTime} title="Schedule at" {...itemProps.scheduleDate} />
      )}
    </Form>
  );
}
