import { ActionPanel, Action, List, Icon } from "@raycast/api";

interface EmployeeProps {
  key: string;
  subtitle?: string;
  employee:
    | {
        id: string;
        displayName: string;
        firstName: string;
        lastName: string;
        preferredName?: string | null | undefined;
        jobTitle: string;
        workPhone: string | null;
        workEmail: string;
        department: string;
        location: string;
        division: string;
        linkedIn: string | null;
        pronouns: string | null;
        workPhoneExtension: string | null;
        supervisor: string;
        photoUploaded: boolean;
        photoUrl: string;
      }
    | null
    | undefined;
}

export default function Employee(props: EmployeeProps) {
  const employee = props.employee;
  const firstName = employee?.preferredName || employee?.firstName;

  if (!employee || !firstName || !props) return null;

  return (
    <List.Item
      key={employee.id}
      icon={{ source: `${employee.photoUrl || null}` }}
      title={employee.displayName}
      accessories={[{ text: props.subtitle }]}
      detail={
        <List.Item.Detail
          markdown={`![${firstName}'s photo](${employee.photoUrl})`}
          metadata={
            <List.Item.Detail.Metadata>
              <List.Item.Detail.Metadata.Label
                title="Name"
                text={`${firstName} ${employee.lastName}${employee.pronouns ? ", " + employee?.pronouns : ""}`}
              />
              {employee.jobTitle && <List.Item.Detail.Metadata.Label title="Title:" text={employee?.jobTitle} />}
              {employee.department && (
                <List.Item.Detail.Metadata.Label title="Department:" text={employee.department} />
              )}
              {employee.division && <List.Item.Detail.Metadata.Label title="Division:" text={employee.division} />}
              {employee.location && <List.Item.Detail.Metadata.Label title="Location:" text={employee.location} />}
              {employee.supervisor && (
                <List.Item.Detail.Metadata.Label title="Supervisor:" text={employee.supervisor} />
              )}
              <List.Item.Detail.Metadata.Separator />
              {employee.workEmail && <List.Item.Detail.Metadata.Label title="Email:" text={employee.workEmail} />}
              {employee.workPhone && <List.Item.Detail.Metadata.Label title="Phone:" text={employee.workPhone} />}
              {employee.workPhoneExtension && (
                <List.Item.Detail.Metadata.Label title="Phone Ext.:" text={employee.workPhoneExtension} />
              )}
              {employee.linkedIn && <List.Item.Detail.Metadata.Label title="LinkedIn:" text={employee.linkedIn} />}
            </List.Item.Detail.Metadata>
          }
        />
      }
      actions={
        <ActionPanel title="Employee Actions">
          {employee.workEmail && (
            <Action.OpenInBrowser
              icon={Icon.Envelope}
              title={`Email ${firstName} ${employee.lastName}`}
              url={`mailto:${employee.workEmail}`}
            />
          )}
          {employee.workPhone && (
            <Action.OpenInBrowser
              icon={Icon.Phone}
              title={`Call ${firstName} ${employee.lastName}`}
              url={`tel:${employee.workPhone}`}
            />
          )}
          {employee.linkedIn && (
            <Action.OpenInBrowser
              icon={Icon.Link}
              // eslint-disable-next-line @raycast/prefer-title-case
              title={`Open ${firstName}'s LinkedIn`}
              url={employee.linkedIn}
            />
          )}
        </ActionPanel>
      }
    />
  );
}
