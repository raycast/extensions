import { FormValidation, useForm } from "@raycast/utils";
import { Action, ActionPanel, Form, LaunchProps } from "@raycast/api";
import { useEffect } from "react";
import { isEmpty } from "lodash";
import { View } from "./lib/oauth/view";
import { FormDatabaseDropdown } from "./lib/components/form-database-dropdown";
import { useBranches } from "./lib/hooks/use-branches";
import { useDeployRequests } from "./lib/hooks/use-deploy-requests";
import { getBranchIcon } from "./lib/icons";

interface CreateDeployRequestForm {
  branch: string;
  deploy: string;
  notes?: string;
  database: string;
}

interface CreateDeployRequestProps extends Partial<LaunchProps> {
  organization?: string;
  database?: string;
  branch?: string;
}

export function CreateDeployRequest(props: CreateDeployRequestProps) {
  const { itemProps, values, handleSubmit, setValue, reset } = useForm<CreateDeployRequestForm>({
    validation: {
      branch: FormValidation.Required,
      deploy: FormValidation.Required,
    },
    initialValues: props.draftValues ?? {
      branch: props.branch,
      database: props.organization ? `${props.organization}-${props.database}` : undefined,
    },
    async onSubmit(values) {
      const [organization, database] = values.database.split("-");

      await createDeployRequest({
        organization,
        database,
        branch: values.branch,
        deploy: values.deploy,
        notes: values.notes,
      });

      reset({ notes: "", branch: values.branch, database: values.database });
    },
  });

  const [organization, database] = values.database ? values.database.split("-") : [undefined, undefined];
  const { branches, branchesLoading } = useBranches({ organization, database });
  const { createDeployRequest } = useDeployRequests({ organization, database });

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
      enableDrafts={!props.organization}
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
          .map((branch) => (
            <Form.Dropdown.Item
              key={branch.name}
              icon={getBranchIcon(branch)}
              title={branch.name}
              value={branch.name}
            />
          ))}
      </Form.Dropdown>
      <Form.Dropdown title="Target" {...itemProps.deploy}>
        {branches
          ?.filter((branch) => branch.name !== values.branch)
          .map((branch) => (
            <Form.Dropdown.Item
              key={branch.name}
              icon={getBranchIcon(branch)}
              title={branch.name}
              value={branch.name}
            />
          ))}
      </Form.Dropdown>
      <Form.Separator />
      <Form.TextArea title="Notes" placeholder="Optional information about your deploy request" {...itemProps.notes} />
    </Form>
  );
}

export default function Command(props: LaunchProps) {
  return (
    <View>
      <CreateDeployRequest {...props} />
    </View>
  );
}
