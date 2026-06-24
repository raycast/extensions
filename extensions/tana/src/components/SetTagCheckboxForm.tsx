import { Action, ActionPanel, Form, Icon, Toast, useNavigation } from "@raycast/api";
import { useForm } from "@raycast/utils";
import { TanaTag } from "../api/contracts";
import { createPreferenceClient } from "../api/preferenceClient";
import { configureTagCheckbox } from "../api/tanaService";

export function SetTagCheckboxForm({
  tag,
  workspaceId,
  onComplete,
}: {
  tag: TanaTag;
  workspaceId: string;
  onComplete?: () => void;
}) {
  const { pop } = useNavigation();
  const { handleSubmit, itemProps } = useForm<{ showCheckbox: boolean }>({
    async onSubmit({ showCheckbox }) {
      const toast = new Toast({ style: Toast.Style.Animated, title: "Updating checkbox" });
      await toast.show();
      try {
        await configureTagCheckbox(createPreferenceClient(workspaceId), tag.id, showCheckbox);
        toast.style = Toast.Style.Success;
        toast.message = showCheckbox ? "Checkbox enabled" : "Checkbox disabled";
        onComplete?.();
        pop();
      } catch (error) {
        toast.style = Toast.Style.Failure;
        toast.message = error instanceof Error ? error.message : "Unknown error";
      }
    },
    initialValues: { showCheckbox: true },
  });

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Save Checkbox Setting" icon={Icon.Check} onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.Description title="Supertag" text={tag.name} />
      <Form.Checkbox label="Show checkbox on tagged nodes" {...itemProps.showCheckbox} />
    </Form>
  );
}

export function SetTagCheckboxAction(props: Parameters<typeof SetTagCheckboxForm>[0]) {
  return <Action.Push title="Configure Checkbox" icon={Icon.CheckCircle} target={<SetTagCheckboxForm {...props} />} />;
}
