import { Form, ActionPanel, Action, showToast, Toast } from "@raycast/api";
import { useState } from "react";
import { inviteTeamMember } from "./api";
import { FastlyRole } from "./types";

export default function InviteTeamMember() {
  const [isLoading, setIsLoading] = useState(false);
  const [nameValue, setNameValue] = useState("");
  const [emailValue, setEmailValue] = useState("");
  const [roleValue, setRoleValue] = useState("user");

  async function handleSubmit(values: { email: string; role: FastlyRole; name: string }) {
    try {
      setIsLoading(true);

      await inviteTeamMember(values);
      await showToast({
        style: Toast.Style.Success,
        title: "Invitation sent",
        message: `Invited ${values.email} as ${values.role}`,
      });
      // Reset form values
      setNameValue("");
      setEmailValue("");
      setRoleValue("user");
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to send invitation",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Form
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Send Invitation" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="name"
        title="Name"
        placeholder="Enter team member's name"
        value={nameValue}
        onChange={setNameValue}
        autoFocus
      />
      <Form.TextField
        id="email"
        title="Email"
        placeholder="Enter email address"
        value={emailValue}
        onChange={setEmailValue}
      />
      <Form.Dropdown id="role" title="Role" value={roleValue} onChange={setRoleValue}>
        <Form.Dropdown.Item value="user" title="User" />
        <Form.Dropdown.Item value="billing" title="Billing" />
        <Form.Dropdown.Item value="engineer" title="Engineer" />
        <Form.Dropdown.Item value="superuser" title="Super User" />
      </Form.Dropdown>
    </Form>
  );
}
