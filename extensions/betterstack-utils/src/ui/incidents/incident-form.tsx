import { Action, ActionPanel, Form, getPreferenceValues, popToRoot, showToast, Toast } from "@raycast/api";
import { useState } from "react";
import { createIncident } from "@/api/betterstack-incidents-api";
import { Optional } from "@/common/utils/optional-utils";

interface IncidentFormValues {
  summary: string;
  description: string;
  requesterEmail: string;
  email: boolean;
  sms: boolean;
  call: boolean;
}

export function IncidentForm() {
  const { requesterEmail } = getPreferenceValues<Preferences>();
  const [summaryError, setSummaryError] = useState<Optional<string>>(undefined);

  async function handleSubmit(values: IncidentFormValues) {
    if (!values.summary.trim()) {
      return setSummaryError("Summary is required");
    }

    const toast = await showToast({ style: Toast.Style.Animated, title: "Creating incident..." });

    try {
      const incident = await createIncident({
        summary: values.summary.trim(),
        description: values.description.trim() || undefined,
        requesterEmail: values.requesterEmail.trim() || undefined,
        email: values.email,
        sms: values.sms,
        call: values.call,
      });

      toast.style = Toast.Style.Success;
      toast.title = "Incident created";
      toast.message = incident.name;
      await popToRoot();
    } catch (error) {
      toast.style = Toast.Style.Failure;
      toast.title = "Failed to create incident";
      toast.message = error instanceof Error ? error.message : String(error);
    }
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Create Incident" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="summary"
        title="Summary"
        placeholder="Brief summary of the incident"
        error={summaryError}
        onChange={() => setSummaryError(undefined)}
      />
      <Form.TextArea id="description" title="Description" placeholder="Full description (optional)" />
      <Form.TextField
        id="requesterEmail"
        title="Requester Email"
        placeholder="you@example.com"
        defaultValue={requesterEmail ?? ""}
      />
      <Form.Separator />
      <Form.Checkbox id="email" label="Email the on-call person" defaultValue={true} />
      <Form.Checkbox id="sms" label="SMS the on-call person" defaultValue={true} />
      <Form.Checkbox id="call" label="Call the on-call person" defaultValue={false} />
    </Form>
  );
}
