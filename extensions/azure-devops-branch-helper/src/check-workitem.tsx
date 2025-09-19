import {
  Form,
  ActionPanel,
  Action,
  Icon,
  Toast,
  showToast,
  useNavigation,
} from "@raycast/api";
import { useEffect, useState } from "react";
import WorkItemDetailsView from "./WorkItemDetailsView";

export default function Command() {
  const [workItemId, setWorkItemId] = useState("");
  const { push } = useNavigation();

  useEffect(() => {
    console.log("[CheckWorkItem] mounted");
    return () => console.log("[CheckWorkItem] unmounted");
  }, []);

  function openDetails(id: string) {
    console.log("[CheckWorkItem] openDetails called", { id });
    const trimmed = id.trim();
    if (!trimmed) {
      showToast(Toast.Style.Failure, "Enter a Work Item ID");
      console.warn("[CheckWorkItem] validation failed: empty id");
      return;
    }
    if (!/^\d+$/.test(trimmed)) {
      showToast(Toast.Style.Failure, "Work Item ID must be a number");
      console.warn("[CheckWorkItem] validation failed: non-numeric id", {
        input: id,
      });
      return;
    }
    console.log("[CheckWorkItem] pushing details view", { trimmed });
    push(
      <WorkItemDetailsView workItemId={trimmed} initialTitle={`#${trimmed}`} />,
    );
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action
            title="Open Work Item"
            icon={Icon.MagnifyingGlass}
            onAction={() => openDetails(workItemId)}
          />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="workItemId"
        title="Work Item ID"
        placeholder="Enter work item ID (e.g., 109)"
        value={workItemId}
        onChange={(v) => {
          console.log("[CheckWorkItem] workItemId changed", v);
          setWorkItemId(v);
        }}
      />
    </Form>
  );
}
