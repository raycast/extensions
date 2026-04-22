import {
  Action,
  ActionPanel,
  Detail,
  Form,
  Icon,
  Toast,
  showToast,
  useNavigation,
} from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { useState } from "react";
import { createIdea, getOrganizations } from "./utils/buffer-api";

interface FormValues {
  organizationId: string;
  title: string;
  text: string;
  includeDate: boolean;
  date: Date | null;
  servicesCsv: string;
}

export default function CreateIdea() {
  const { pop } = useNavigation();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [includeDate, setIncludeDate] = useState(false);
  const {
    data: organizations,
    isLoading,
    error,
  } = usePromise(getOrganizations);

  if (error) {
    return (
      <Detail
        markdown={`## ❌ Error\n\n${error.message}\n\nCheck your **Buffer Access Token** in Raycast preferences.`}
      />
    );
  }

  async function handleSubmit(values: FormValues) {
    if (!values.organizationId) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Select an organization",
      });
      return;
    }

    if (!values.title.trim() && !values.text.trim()) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Add at least a title or text",
      });
      return;
    }

    setIsSubmitting(true);
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: "Creating idea…",
    });

    try {
      const services = values.servicesCsv
        .split(",")
        .map((service) => service.trim())
        .filter(Boolean);

      const idea = await createIdea({
        organizationId: values.organizationId,
        title: values.title.trim() || undefined,
        text: values.text.trim() || undefined,
        date: includeDate ? (values.date ?? undefined) : undefined,
        services: services.length ? services : undefined,
      });

      toast.style = Toast.Style.Success;
      toast.title = "Idea created";
      toast.message = `ID: ${idea.id}`;
      pop();
    } catch (submissionError) {
      toast.style = Toast.Style.Failure;
      toast.title = "Failed to create idea";
      toast.message =
        submissionError instanceof Error
          ? submissionError.message
          : String(submissionError);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Form
      isLoading={isLoading || isSubmitting}
      navigationTitle="Create Idea"
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Create Idea"
            icon={Icon.LightBulb}
            onSubmit={handleSubmit}
          />
          <Action.OpenInBrowser
            title="Open Buffer"
            url="https://publish.buffer.com/create"
            shortcut={{ modifiers: ["cmd"], key: "o" }}
          />
        </ActionPanel>
      }
    >
      <Form.Dropdown id="organizationId" title="Organization">
        {(organizations ?? []).map((organization) => (
          <Form.Dropdown.Item
            key={organization.id}
            value={organization.id}
            title={organization.name}
          />
        ))}
      </Form.Dropdown>

      <Form.TextField
        id="title"
        title="Title"
        placeholder="Campaign concept, hook, or headline"
      />

      <Form.TextArea
        id="text"
        title="Idea Text"
        placeholder="Capture the content idea, notes, references, or outline"
        enableMarkdown={false}
      />

      <Form.TextField
        id="servicesCsv"
        title="Target Services"
        placeholder="instagram, linkedin, x"
        info="Optional comma-separated Buffer service names."
      />

      <Form.Checkbox
        id="includeDate"
        label="Attach a target date"
        value={includeDate}
        onChange={setIncludeDate}
      />

      {includeDate && (
        <Form.DatePicker
          id="date"
          title="Target Date"
          type={Form.DatePicker.Type.DateTime}
        />
      )}
    </Form>
  );
}
