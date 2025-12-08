import { Action, ActionPanel, Form, Icon, showToast, Toast, useNavigation } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { getIssueLinkTypes, linkIssues } from "./utils/jira";

export default function Command() {
  const { pop } = useNavigation();
  const { data: linkTypes, isLoading } = usePromise(getIssueLinkTypes);

  async function handleSubmit(values: { sourceKey: string; targetKey: string; linkType: string }) {
    if (!values.sourceKey || !values.targetKey) {
      showToast({ style: Toast.Style.Failure, title: "Both issue keys are required" });
      return;
    }

    try {
      showToast({ style: Toast.Style.Animated, title: "Linking issues..." });
      await linkIssues(values.sourceKey, values.targetKey, values.linkType);
      showToast({ style: Toast.Style.Success, title: "Issues Linked" });
      pop();
    } catch (error) {
      showToast({ style: Toast.Style.Failure, title: "Failed to link issues", message: String(error) });
    }
  }

  return (
    <Form
      navigationTitle="Link Issues"
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm onSubmit={handleSubmit} title="Link Issues" />
        </ActionPanel>
      }
    >
      <Form.TextField id="sourceKey" title="Source Issue" placeholder="e.g. PROJ-123" autoFocus />

      <Form.Dropdown id="linkType" title="Link Type">
        {linkTypes?.map((type) => (
          <Form.Dropdown.Item key={type.id} value={type.name} title={type.name} icon={Icon.Link} />
        ))}
      </Form.Dropdown>

      <Form.TextField id="targetKey" title="Target Issue" placeholder="e.g. PROJ-456" />
    </Form>
  );
}
