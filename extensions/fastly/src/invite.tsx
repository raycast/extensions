import { Form, ActionPanel, Action, showToast, Toast, Icon } from "@raycast/api";
import { useState } from "react";
import { inviteTeamMember } from "./api";
import { FastlyRole } from "./types";
import { FormValidation, useForm } from "@raycast/utils";

export default function InviteTeamMember() {
  const [isLoading, setIsLoading] = useState(false);

  const { handleSubmit, itemProps, reset } = useForm<{ email: string; role: string; name: string }>({
    async onSubmit(values) {
      try {
        setIsLoading(true);

        await inviteTeamMember({ ...values, role: values.role as FastlyRole });
        await showToast({
          style: Toast.Style.Success,
          title: "Invitation sent",
          message: `Invited ${values.email} as ${values.role}`,
        });
        reset();
      } catch (error) {
        await showToast({
          style: Toast.Style.Failure,
          title: "Failed to send invitation",
          message: error instanceof Error ? error.message : "Unknown error",
        });
      } finally {
        setIsLoading(false);
      }
    },
    validation: {
      name: FormValidation.Required,
      email: FormValidation.Required,
    },
  });

  return (
    <Form
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm icon={Icon.AddPerson} title="Send Invitation" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField title="Name" placeholder="Enter team member's name" {...itemProps.name} />
      <Form.TextField title="Email" placeholder="Enter email address" {...itemProps.email} />
      <Form.Dropdown title="Role" {...itemProps.role}>
        <Form.Dropdown.Item value="user" title="User" />
        <Form.Dropdown.Item value="billing" title="Billing" />
        <Form.Dropdown.Item value="engineer" title="Engineer" />
        <Form.Dropdown.Item value="superuser" title="Super User" />
      </Form.Dropdown>
    </Form>
  );
}
