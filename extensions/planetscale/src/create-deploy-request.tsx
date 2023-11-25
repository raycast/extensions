import { useBranches, useDatabases, useOrganizations } from "./utils/hooks";
import { FormValidation, getAvatarIcon, useForm, usePromise } from "@raycast/utils";
import { Action, ActionPanel, Form, showToast, Toast } from "@raycast/api";
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

async function getDeployRequest(values: CreateDeployRequestForm) {
  const existingRequests = await pscale.listDeployRequests({
    state: "open",
    branch: values.branch,
    into_branch: values.deploy,
    database: values.database,
    organization: values.organization,
  });
  return existingRequests.data.data[0];
}

function useExistingDeployRequest(values: CreateDeployRequestForm) {
  const { data, isLoading } = usePromise(getDeployRequest, [values]);
  return { existingDeployRequest: data, existingDeployRequestLoading: isLoading };
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
  const { itemProps, values, handleSubmit, setValidationError, setValue, reset } = useForm<CreateDeployRequestForm>({
    validation: {
      branch: FormValidation.Required,
      deploy: FormValidation.Required,
    },
    initialValues: {
      branch,
      organization,
      database,
    },
    async onSubmit(values) {
      const toast = await showToast({ style: Toast.Style.Animated, title: "Creating deploy request" });

      const existingDeployRequest = await getDeployRequest(values);
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

      reset({
        notes: "",
        branch: "",
      });

      toast.title = "Deploy request created";
      toast.style = Toast.Style.Success;
      enrichToastWithURL(toast, deployRequest.data.html_url);
    },
  });

  const { existingDeployRequest, existingDeployRequestLoading } = useExistingDeployRequest(values);

  const { organizations, organizationsLoading } = useOrganizations();
  const { databases, databasesLoading } = useDatabases({ organization: values.organization });
  const { branches, branchesLoading } = useBranches({ organization: values.organization, database: values.database });

  const isLoading = organizationsLoading || branchesLoading || databasesLoading || existingDeployRequestLoading;

  useEffect(() => {
    if (!branchesLoading && !branch) {
      const branch = branches?.find((b) => !b.production)?.name;
      if (branch) setValue("branch", branch);

      const deploy = branches?.find((b) => b.production)?.name;
      if (deploy) setValue("deploy", deploy);
    }
  }, [branchesLoading, branches, branch]);

  useEffect(() => {
    if (existingDeployRequest) {
      setValidationError("branch", "Deploy request exists.");
    } else {
      setValidationError("branch", null);
    }
  }, [existingDeployRequest]);

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
        <Form.Dropdown storeValue title="Organization" {...itemProps.organization}>
          {organizations?.map((organization) => (
            <Form.Dropdown.Item
              key={organization.name}
              icon={getAvatarIcon(organization.name)}
              title={organization.name}
              value={organization.name}
            />
          ))}
        </Form.Dropdown>
      )}
      {!database && (
        <Form.Dropdown storeValue title="Database" {...itemProps.database}>
          {databases?.map((database) => (
            <Form.Dropdown.Item key={database.name} title={database.name} value={database.name} />
          ))}
        </Form.Dropdown>
      )}
      {!organization || !database ? <Form.Separator /> : null}
      <Form.Dropdown autoFocus title="Origin" {...itemProps.branch}>
        {branches
          ?.filter((branch) => !branch.production)
          .map((branch) => <Form.Dropdown.Item key={branch.name} title={branch.name} value={branch.name} />)}
      </Form.Dropdown>
      <Form.Dropdown title="Target" {...itemProps.deploy}>
        {branches
          ?.filter((branch) => branch.name !== values.branch)
          .map((branch) => <Form.Dropdown.Item key={branch.name} title={branch.name} value={branch.name} />)}
      </Form.Dropdown>
      <Form.Separator />
      <Form.TextArea title="Notes" placeholder="Optional information about your deploy request" {...itemProps.notes} />
    </Form>
  );
}
