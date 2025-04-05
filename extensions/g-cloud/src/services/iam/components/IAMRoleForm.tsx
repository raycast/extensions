import { ActionPanel, Action, Form, showToast, Toast } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { useState } from "react";
import { IAMService } from "../IAMService";

interface IAMRoleFormProps {
  iamService: IAMService;
  rolesByService: { title: string; roles: { value: string; title: string }[] }[];
  onRoleAdded: () => void;
  onCancel: () => void;
}

interface MemberTypeInfo {
  type: string;
  id: string;
}

/**
 * Parses a member string to determine the member type and ID.
 * Format can be either:
 * - "type:id" (e.g. "user:alice@example.com")
 * - "email@domain.com" (treated as user)
 * - "name" (treated as serviceAccount)
 */
function parseMemberString(memberString: string): MemberTypeInfo {
  if (memberString.includes(":")) {
    const [type, id] = memberString.split(":", 2);
    return { type, id };
  }

  if (memberString.includes("@")) {
    return { type: "user", id: memberString };
  }

  return { type: "serviceAccount", id: memberString };
}

export default function IAMRoleForm({ iamService, rolesByService, onRoleAdded, onCancel }: IAMRoleFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [availableRoles, setAvailableRoles] = useState<{ value: string; title: string }[]>([]);
  const [selectedRole, setSelectedRole] = useState<string>("");

  // Update available roles when service changes
  function handleServiceChange(value: string) {
    const service = rolesByService.find((s) => s.title === value);
    setAvailableRoles(service?.roles || []);
    setSelectedRole(""); // Reset role selection when service changes
  }

  async function handleSubmit(values: {
    member: string;
    role: string;
    condition?: string;
    conditionTitle?: string;
    conditionDescription?: string;
  }) {
    // Validate required fields
    const missingFields = [];
    if (!values.member?.trim()) missingFields.push("Member");
    if (!values.role?.trim()) missingFields.push("Role");

    // Validate condition title is provided if condition exists
    if (values.condition?.trim() && !values.conditionTitle?.trim()) {
      missingFields.push("Condition Title");
    }

    if (missingFields.length > 0) {
      showToast({
        style: Toast.Style.Failure,
        title: "Missing Required Fields",
        message: `Please fill in: ${missingFields.join(", ")}`,
      });
      return;
    }

    setIsSubmitting(true);

    // Show loading toast
    const loadingToast = await showToast({
      style: Toast.Style.Animated,
      title: "Adding role...",
      message: `Adding ${values.role} to ${values.member}`,
    });

    try {
      const { type: memberType, id: memberId } = parseMemberString(values.member);

      // Add the member to the role
      await iamService.addMember(values.role, memberType, memberId);

      // Hide loading toast
      loadingToast.hide();

      showToast({
        style: Toast.Style.Success,
        title: "Role added successfully",
        message: `Added ${memberType}:${memberId} to ${values.role}`,
      });

      onRoleAdded();
    } catch (error) {
      console.error("Error adding role:", error);

      // Hide loading toast
      loadingToast.hide();

      showFailureToast(error, {
        title: "Failed to add role",
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Form
      isLoading={isSubmitting}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Add Role" onSubmit={handleSubmit} />
          <Action title="Cancel" onAction={onCancel} />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="member"
        title="Member"
        placeholder="user:user@example.com or serviceAccount:name@project.iam.gserviceaccount.com"
        info="The principal to grant the role to"
      />

      <Form.Dropdown id="service" title="Service" placeholder="Select a service" onChange={handleServiceChange}>
        {rolesByService.map((service) => (
          <Form.Dropdown.Item key={service.title} value={service.title} title={service.title} />
        ))}
      </Form.Dropdown>

      <Form.Dropdown
        id="role"
        title="Role"
        value={selectedRole}
        onChange={setSelectedRole}
        placeholder="Select a role"
        info="The role to grant to the member"
      >
        {availableRoles.map((role) => (
          <Form.Dropdown.Item key={role.value} value={role.value} title={role.title} />
        ))}
      </Form.Dropdown>

      <Form.Separator />

      <Form.TextArea
        id="condition"
        title="Condition (Optional)"
        placeholder="resource.name.startsWith('projects/_/buckets/example-bucket')"
        info="CEL expression for conditional role binding"
      />

      <Form.TextField
        id="conditionTitle"
        title="Condition Title"
        placeholder="Access to specific bucket"
        info="Required if condition is provided. Used to identify and manage the condition."
      />

      <Form.TextField
        id="conditionDescription"
        title="Condition Description (Optional)"
        placeholder="Grants access only to the specified bucket"
        info="A description of the condition"
      />
    </Form>
  );
}
