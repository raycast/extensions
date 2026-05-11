import { Database, DatabaseUpdateRequest } from "@neondatabase/api-client";
import { List, Icon, ActionPanel, Action, useNavigation, showToast, Toast, Form, Color, Detail } from "@raycast/api";
import { usePromise, MutatePromise, useForm, FormValidation } from "@raycast/utils";
import { neon } from "../neon";
import { OpenInNeon } from "../components";

export function RolesAndDatabases({ projectId, branchId }: { projectId: string; branchId: string }) {
  const {
    isLoading: isLoadingDatabases,
    data: databases = [],
    mutate: mutateDatabases,
  } = usePromise(async () => {
    const res = await neon.listProjectBranchDatabases(projectId, branchId);
    return res.data.databases;
  });
  const { isLoading: isLoadingRoles, data: roles = [] } = usePromise(async () => {
    const res = await neon.listProjectBranchRoles(projectId, branchId);
    return res.data.roles;
  });

  const isLoading = isLoadingDatabases || isLoadingRoles;
  return (
    <List isLoading={isLoading}>
      <List.Section title="Roles">
        {roles.map((role) => (
          <List.Item
            key={role.name}
            icon={Icon.Person}
            title={role.name}
            accessories={[
              role.protected
                ? { icon: Icon.Lock, tooltip: "Protected" }
                : { icon: Icon.LockUnlocked, tooltip: "Unprotected" },
            ]}
            actions={
              <ActionPanel>
                <OpenInNeon route={`projects/${projectId}/branches/${branchId}/roles_and_databases`} />
              </ActionPanel>
            }
          />
        ))}
      </List.Section>
      <List.Section title="Databases">
        {databases.map((database) => (
          <List.Item
            key={database.id}
            icon={Icon.Coin}
            title={database.name}
            actions={
              <ActionPanel>
                <Action.Push
                  icon={{ source: "table.svg", tintColor: Color.PrimaryText }}
                  title="View Schema"
                  target={<DatabaseSchema projectId={projectId} database={database} />}
                />
                <Action.Push
                  icon={Icon.Pencil}
                  title="Update Database"
                  target={<UpdateDatabase projectId={projectId} database={database} mutate={mutateDatabases} />}
                />
                <OpenInNeon route={`projects/${projectId}/branches/${branchId}/roles_and_databases`} />
              </ActionPanel>
            }
          />
        ))}
      </List.Section>
    </List>
  );
}

function DatabaseSchema({ projectId, database }: { projectId: string; database: Database }) {
  const { isLoading, data: sql } = usePromise(async () => {
    const res = await neon.getProjectBranchSchema({ projectId, branchId: database.branch_id, db_name: database.name });
    return res.data.sql;
  });

  return (
    <Detail
      isLoading={isLoading}
      markdown={sql}
      actions={
        <ActionPanel>
          <OpenInNeon route={`projects/${projectId}/branches/${database.branch_id}/tables`} />
        </ActionPanel>
      }
    />
  );
}

function UpdateDatabase({
  projectId,
  database,
  mutate,
}: {
  projectId: string;
  database: Database;
  mutate: MutatePromise<Database[], undefined>;
}) {
  const { pop } = useNavigation();
  const { handleSubmit, itemProps } = useForm<DatabaseUpdateRequest["database"]>({
    async onSubmit(values) {
      const toast = await showToast(Toast.Style.Animated, "Updating database", database.name);
      try {
        await mutate(
          neon.updateProjectBranchDatabase(projectId, database.branch_id, "database.name", {
            database: values,
          }),
        );
        toast.style = Toast.Style.Success;
        toast.title = "Updated database";
        pop();
      } catch (error) {
        toast.style = Toast.Style.Failure;
        toast.title = "Updating failed";
        toast.message = `${error}`;
      }
    },
    initialValues: {
      name: database.name,
      owner_name: database.owner_name,
    },
    validation: {
      name: FormValidation.Required,
      owner_name: FormValidation.Required,
    },
  });
  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm icon={Icon.Pencil} onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.Description title="Database ID" text={database.id.toString()} />
      <Form.TextField title="Name" placeholder={database.name} {...itemProps.name} />
      <Form.TextField title="Owner Name" placeholder={database.owner_name} {...itemProps.owner_name} />
    </Form>
  );
}
