import { Action, ActionPanel, showToast, Toast, useNavigation, Form } from "@raycast/api";

import { useGroups, useOrganizations } from "./hooks";
import { createDatabase } from "./utils/api";
import DatabaseList from "./databases";

type FormValues = {
  organization: string;
  group: string;
  name: string;
};

export default function CreateDatabaseView() {
  const { data: organizations, isLoading: isLoadingOrgs } = useOrganizations();
  const { data: groups, isLoading: isLoadingGroups, revalidate: revalidateGroups } = useGroups();

  const { push } = useNavigation();

  return (
    <Form
      navigationTitle="Create Database"
      isLoading={isLoadingGroups}
      actions={
        <ActionPanel>
          <Action.SubmitForm
            onSubmit={async (values: FormValues) => {
              const toast = await showToast({ title: "Creating database...", style: Toast.Style.Animated });
              await createDatabase(values.organization, values.group, values.name);
              toast.style = Toast.Style.Success;
              toast.title = "Database created";
              push(<DatabaseList />);
            }}
          />
        </ActionPanel>
      }
    >
      <Form.Dropdown
        isLoading={isLoadingOrgs}
        id="organization"
        title="Organization"
        onChange={(newvalue) => revalidateGroups(newvalue)}
      >
        {organizations.map((org) => (
          <Form.Dropdown.Item key={org.slug} value={org.slug} title={org.slug} />
        ))}
      </Form.Dropdown>
      <Form.Dropdown isLoading={isLoadingGroups} id="group" title="Group">
        {groups.map((group) => (
          <Form.Dropdown.Item key={group.name} value={group.name} title={group.name} />
        ))}
      </Form.Dropdown>
      <Form.TextField id="name" title="Database Name" />
    </Form>
  );
}
