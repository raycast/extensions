import { Action, ActionPanel, Form, Icon, Toast, showToast, useNavigation } from "@raycast/api";
import { useEffect, useState } from "react";
import { getGroup, updateGroup } from "../api/groups";

export default function EditGroup({ groupId }: { groupId: string }) {
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const { pop } = useNavigation();

  useEffect(() => {
    async function load() {
      try {
        const group = await getGroup(groupId);
        setName(group.profile.name || "");
        setDescription(group.profile.description || "");
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } catch (e: any) {
        await showToast({ style: Toast.Style.Failure, title: "Failed to load group", message: e.message });
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [groupId]);

  async function handleSubmit(values: { name: string; description: string }) {
    try {
      setLoading(true);
      await showToast({ style: Toast.Style.Animated, title: "Updating group..." });
      await updateGroup(groupId, { name: values.name, description: values.description });
      await showToast({ style: Toast.Style.Success, title: "Group updated" });
      pop();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (e: any) {
      setLoading(false);
      await showToast({ style: Toast.Style.Failure, title: "Failed to update group", message: e.message });
    }
  }

  return (
    <Form
      isLoading={loading}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Save Changes" icon={Icon.Check} onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField id="name" title="Name" value={name} onChange={setName} />
      <Form.TextField id="description" title="Description" value={description} onChange={setDescription} />
    </Form>
  );
}
