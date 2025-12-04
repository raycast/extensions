import { FormValidation, useForm } from "@raycast/utils";
import { Action, ActionPanel, Form, LaunchProps } from "@raycast/api";
import { isEmpty, sample } from "lodash";
import { useState } from "react";
import { View } from "./lib/oauth/view";
import { FormDatabaseDropdown } from "./lib/components/form-database-dropdown";
import { useBranches } from "./lib/hooks/use-branches";
import { getBranchIcon } from "./lib/icons";

interface CreateBranchForm {
  name: string;
  parent: string;
  database: string;
}

const placeholderBranchNames = [
  "321-replace-postgres-with-mysql",
  "911-remove-elephant-database",
  "153-give-steve-the-editor-a-raise",
  "107-create-indices-aaron-suggested",
];

interface CreateBranchProps extends Partial<LaunchProps> {
  organization?: string;
  database?: string;
  branch?: string;
}

export function CreateBranch(props: CreateBranchProps) {
  const [placeholderBranchName] = useState(() => sample(placeholderBranchNames));

  const { itemProps, values, handleSubmit, reset } = useForm<CreateBranchForm>({
    validation: {
      name: FormValidation.Required,
      parent: FormValidation.Required,
      database: FormValidation.Required,
    },
    initialValues: props.draftValues ?? {
      name: "",
      parent: props.branch,
      database: props.organization ? `${props.organization}-${props.database}` : "",
    },
    async onSubmit(values) {
      const [organization, database] = values.database.split("-");

      await createBranch({
        name: values.name,
        parent: values.parent,
        database,
        organization,
      });

      reset({ name: "", database: values.database, parent: values.parent });
    },
  });

  const [organization, database] = values.database.split("-");
  const { branches, branchesLoading, createBranch } = useBranches({ organization, database });

  return (
    <Form
      enableDrafts={!props.organization}
      isLoading={branchesLoading}
      navigationTitle="Create Branch"
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Create Branch" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <FormDatabaseDropdown storeValue title="Database" autoFocus={isEmpty(props)} {...itemProps.database} />
      <Form.Dropdown title="Parent" {...itemProps.parent}>
        {branches.map((branch) => (
          <Form.Dropdown.Item key={branch.name} icon={getBranchIcon(branch)} title={branch.name} value={branch.name} />
        ))}
      </Form.Dropdown>
      <Form.TextField
        title="Name"
        autoFocus={!isEmpty(props)}
        placeholder={placeholderBranchName}
        {...itemProps.name}
        onChange={(value) => {
          itemProps.name.onChange?.(value.replace(" ", "-"));
        }}
      />
    </Form>
  );
}

export default function Command(props: LaunchProps) {
  return (
    <View>
      <CreateBranch {...props} />
    </View>
  );
}
