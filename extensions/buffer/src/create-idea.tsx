import {
  Action,
  ActionPanel,
  Form,
  showToast,
  Toast,
  Icon,
  popToRoot,
} from "@raycast/api";
import { createIdea } from "./api";
import { useOrganization } from "./hooks/useOrganization";

export default function CreateIdeaCommand() {
  const {
    organizations,
    selectedOrg,
    needsOrgPicker,
    selectOrgById,
    isLoading,
  } = useOrganization();

  async function handleSubmit(values: {
    organizationId?: string;
    title: string;
    text: string;
  }) {
    if (!selectedOrg) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Select an organization",
      });
      return;
    }
    if (!values.title.trim() && !values.text.trim()) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Add a title or some text",
      });
      return;
    }

    const toast = await showToast({
      style: Toast.Style.Animated,
      title: "Saving idea\u2026",
    });

    try {
      const idea = await createIdea({
        organizationId: selectedOrg.id,
        title: values.title || undefined,
        text: values.text || undefined,
      });

      toast.style = Toast.Style.Success;
      toast.title = "Idea saved";
      toast.message = idea.content.title ?? "Untitled idea";
      await popToRoot();
    } catch (err) {
      toast.style = Toast.Style.Failure;
      toast.title = "Failed to save idea";
      toast.message = err instanceof Error ? err.message : String(err);
    }
  }

  return (
    <Form
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Save Idea"
            icon={Icon.LightBulb}
            onSubmit={handleSubmit}
          />
        </ActionPanel>
      }
    >
      {needsOrgPicker && (
        <Form.Dropdown
          id="organizationId"
          title="Organization"
          value={selectedOrg?.id ?? ""}
          onChange={selectOrgById}
        >
          {organizations?.map((org) => (
            <Form.Dropdown.Item key={org.id} value={org.id} title={org.name} />
          ))}
        </Form.Dropdown>
      )}

      <Form.TextField
        id="title"
        title="Title"
        placeholder="Idea title (optional)"
      />

      <Form.TextArea
        id="text"
        title="Content"
        placeholder="Capture your idea\u2026"
        enableMarkdown={false}
      />
    </Form>
  );
}
