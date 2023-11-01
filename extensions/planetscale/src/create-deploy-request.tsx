import { useBranches, useDatabases, useOrganizations } from "./utils/hooks";
import { FormValidation, useForm } from "@raycast/utils";
import { Action, ActionPanel, Form, popToRoot, showToast, Toast } from "@raycast/api";
import { pscale } from "./utils/api";
import { useEffect } from "react";
import { enrichToastWithURL } from "./utils/raycast";

interface CreateDeployRequestForm {
  branch: string;
  deploy: string;
  notes?: string;
  database: string;
  organization: string;
}

export default function CreateDeployRequest({
  database,
  organization,
  branch,
}: {
  database?: string;
  organization?: string;
  branch?: string;
}) {
  const { itemProps, handleSubmit, values, setValue } = useForm<CreateDeployRequestForm>({
    validation: {
      branch: FormValidation.Required,
      deploy: FormValidation.Required,
    },
    initialValues: {
      branch: branch,
      organization,
      database,
    },
    async onSubmit(values) {
      const toast = await showToast({ style: Toast.Style.Animated, title: "Creating deploy request" });

      const existingRequests = await pscale.listDeployRequests({
        state: "open",
        branch: values.branch,
        into_branch: values.deploy,
        database: values.database ?? database,
        organization: values.organization ?? organization,
      });

      const existingDeployRequest = existingRequests.data.data[0];
      if (existingDeployRequest) {
        toast.title = "Existing deploy request";
        toast.message = "A deploy request with the same details already exists";
        toast.style = Toast.Style.Failure;
        enrichToastWithURL(toast, existingDeployRequest.html_url);
        return;
      }

      const deployRequest = await pscale.createADeployRequest(
        {
          branch: values.branch,
          into_branch: values.deploy,
          notes: values.notes,
        },
        {
          database: values.database ?? database,
          organization: values.organization ?? organization,
        },
      );

      toast.title = "Deploy request created";
      toast.style = Toast.Style.Success;
      enrichToastWithURL(toast, deployRequest.data.html_url);

      await popToRoot();
    },
  });

  const { organizations, organizationsLoading } = useOrganizations();
  const { databases, databasesLoading } = useDatabases({ organization: values.organization });
  const { branches, branchesLoading } = useBranches({ organization: values.organization, database: values.database });

  const isLoading = organizationsLoading || branchesLoading || databasesLoading;

  useEffect(() => {
    if (!branchesLoading && !branch) {
      const branch = branches?.find((b) => !b.production)?.name;
      if (branch) setValue("branch", branch);

      const deploy = branches?.find((b) => b.production)?.name;
      if (deploy) setValue("deploy", deploy);
    }
  }, [branchesLoading, branches, branch]);

  return (
    <Form
      enableDrafts={!organization}
      isLoading={isLoading}
      navigationTitle={`Create Deploy Request (${values.branch} -> ${values.deploy})`}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Create Deploy Request" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      {!organization && (
        <Form.Dropdown title="Organization" {...itemProps.organization}>
          {organizations?.map((organization) => (
            <Form.Dropdown.Item key={organization.name} title={organization.name} value={organization.name} />
          ))}
        </Form.Dropdown>
      )}
      {!database && (
        <Form.Dropdown title="Database" {...itemProps.database}>
          {databases?.map((database) => (
            <Form.Dropdown.Item key={database.name} title={database.name} value={database.name} />
          ))}
        </Form.Dropdown>
      )}
      {!organization || !database ? <Form.Separator /> : null}
      <Form.Dropdown title="Origin" {...itemProps.branch}>
        {branches
          ?.filter((branch) => !branch.production)
          .map((branch) => <Form.Dropdown.Item key={branch.name} title={branch.name} value={branch.name} />)}
      </Form.Dropdown>
      <Form.Dropdown autoFocus={!!branch} title="Target" {...itemProps.deploy}>
        {branches
          ?.filter((branch) => branch.id !== values.branch)
          .map((branch) => <Form.Dropdown.Item key={branch.name} title={branch.name} value={branch.name} />)}
      </Form.Dropdown>
      <Form.Separator />
      <Form.TextArea title="Notes" placeholder="Optional information about your deploy request" {...itemProps.notes} />
    </Form>
  );
}
