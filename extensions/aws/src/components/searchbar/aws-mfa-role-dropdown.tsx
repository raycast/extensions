import { Icon, List, Color, showToast, Toast } from "@raycast/api";
import { useMfaSession, RoleId } from "../../hooks/use-mfa-session";

interface Props {
  onRoleSelected?: () => void;
}

export default function AwsMfaRoleDropdown({ onRoleSelected }: Props) {
  const { roleStatuses, activeRole, setActiveRole } = useMfaSession();

  return (
    <List.Dropdown
      tooltip="Select AWS Account/Role"
      value={activeRole}
      onChange={(newRole) => {
        const selectedRole = roleStatuses.find((r) => r.id === newRole);
        const success = setActiveRole(newRole as RoleId);
        if (!success) {
          showToast(Toast.Style.Failure, "Session expired", `Authenticate to ${selectedRole?.name} first`);
          return;
        }
        onRoleSelected?.();
      }}
    >
      {roleStatuses.map((role) => (
        <List.Dropdown.Item
          key={role.id}
          value={role.id}
          title={role.name}
          icon={
            role.isValid
              ? { source: Icon.CheckCircle, tintColor: Color.Green }
              : { source: Icon.XMarkCircle, tintColor: Color.Red }
          }
          keywords={[role.name, role.accountName, role.account]}
        />
      ))}
    </List.Dropdown>
  );
}
