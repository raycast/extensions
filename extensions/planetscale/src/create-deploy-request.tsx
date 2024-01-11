import { useBranches } from "./utils/hooks";
import { FormValidation, useForm } from "@raycast/utils";
import { Action, ActionPanel, Form, showToast, Toast } from "@raycast/api";
import { useEffect } from "react";
import { enrichToastWithURL } from "./utils/raycast";
import { getPlanetScaleClient } from "./utils/client";
import { FormDatabaseDropdown, View } from "./utils/components";
import { isEmpty } from "lodash";
import { PlanetScaleError } from "./utils/api";

interface CreateDeployRequestForm {
  branch: string;
  deploy: string;
  notes?: string;
  database: string;
}

interface CreateDeployRequestProps {
  organization: string;
  database: string;
  branch: string;
}

export function CreateDeployRequest(props: CreateDeployRequestProps | object) {
  const { itemProps, values, handleSubmit, setValue, reset } = useForm<CreateDeployRequestForm>({
    validation: {
      branch: FormValidation.Required,
      deploy: FormValidation.Required,
    },
    initialValues: {
      branch: "branch" in props ? props.branch : undefined,
      database: "organization" in props ? `${props.organization}-${props.database}` : undefined,
    },
    async onSubmit(values) {
      const pscale = getPlanetScaleClient();

      const [organization, database] = values.database.split("-");

      const toast = await showToast({ style: Toast.Style.Animated, title: "Creating deploy request" });

      try {
        const deployRequest = await pscale.createADeployRequest(
          {
            branch: values.branch,
            into_branch: values.deploy,
            notes: values.notes,
          },
          { database, organization },
        );
        toast.title = "Deploy request created";
        toast.style = Toast.Style.Success;
        enrichToastWithURL(toast, { resource: "Deploy Request", url: deployRequest.data.html_url });

        reset({ notes: "", branch: values.branch, database: values.database });
      } catch (error) {
        if (error instanceof PlanetScaleError) {
          toast.title = "Failed to create deploy request";
          toast.message = error.data.message;
          toast.style = Toast.Style.Failure;
        } else {
          throw error;
        }
      }
    },
  });

  const [organization, database] = values.database ? values.database.split("-") : [undefined, undefined];
  const { branches, branchesLoading } = useBranches({ organization, database });

  useEffect(() => {
    if (!branchesLoading && !values.branch) {
      const branch = branches?.find((b) => !b.production)?.name;
      if (branch) setValue("branch", branch);

      const deploy = branches?.find((b) => b.production)?.name;
      if (deploy) setValue("deploy", deploy);
    }
  }, [branchesLoading, branches, values.branch]);

  return (
    <Form
      enableDrafts={!props}
      isLoading={branchesLoading}
      navigationTitle={
        values.branch && values.deploy
          ? `Create Deploy Request (${values.branch} -> ${values.deploy})`
          : `Create Deploy Request`
      }
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Create Deploy Request" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <FormDatabaseDropdown autoFocus={isEmpty(props)} storeValue title="Database" {...itemProps.database} />
      <Form.Dropdown autoFocus={!isEmpty(props)} title="Origin" {...itemProps.branch}>
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

export default function Command() {
  return (
    <View>
      <CreateDeployRequest />
    </View>
  );
}
