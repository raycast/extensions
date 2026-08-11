import {
  Form,
  ActionPanel,
  Action,
  useNavigation,
  showToast,
  Toast,
} from "@raycast/api";
import { useState } from "react";
import { createClass } from "../utils/vault";

interface QuickAddClassProps {
  period: string;
  dayOfWeek: number;
  onClassAdded: () => void;
}

export function QuickAddClass({
  period,
  dayOfWeek,
  onClassAdded,
}: QuickAddClassProps) {
  const { pop } = useNavigation();
  const [isLoading, setIsLoading] = useState(false);

  async function handleSubmit(values: { name: string; note: string }) {
    if (!values.name.trim()) {
      showToast({ style: Toast.Style.Failure, title: "Name is required" });
      return;
    }

    setIsLoading(true);
    try {
      createClass(values.name.trim(), period, dayOfWeek, values.note);
      showToast({ style: Toast.Style.Success, title: "Class created" });
      onClassAdded();
      pop();
    } catch (error) {
      showToast({
        style: Toast.Style.Failure,
        title: "Failed to create class",
      });
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Form
      isLoading={isLoading}
      navigationTitle="Quick Add Class"
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Create Class" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="name"
        title="Name"
        placeholder="Meeting with..."
        autoFocus
      />
      <Form.TextArea id="note" title="Note" placeholder="Optional note..." />
      <Form.Description title="Period" text={`Period ${period}`} />
    </Form>
  );
}
