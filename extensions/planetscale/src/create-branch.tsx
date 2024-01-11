import { useBranches } from "./utils/hooks";
import { FormValidation, useForm } from "@raycast/utils";
import { Action, ActionPanel, Color, Form, showToast, Toast } from "@raycast/api";
import { enrichToastWithURL } from "./utils/raycast";
import { getPlanetScaleClient } from "./utils/client";
import { FormDatabaseDropdown, View } from "./utils/components";
import { PlanetScaleColor } from "./utils/colors";
import { PlanetScaleError } from "./utils/api";
import { isEmpty, sample } from "lodash";
import { useState } from "react";

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

export function CreateBranch(
  props:
    | {
        organization: string;
        database: string;
        branch: string;
      }
    | object,
) {
  const [placeholderBranchName] = useState(() => sample(placeholderBranchNames));

  const { itemProps, values, handleSubmit, reset } = useForm<CreateBranchForm>({
    validation: {
      name: FormValidation.Required,
      parent: FormValidation.Required,
      database: FormValidation.Required,
    },
    initialValues: {
      name: "",
      database: "organization" in props ? `${props.organization}-${props.database}` : "",
    },
    async onSubmit(values) {
      const pscale = getPlanetScaleClient();

      const [organization, database] = values.database.split("-");

      const toast = await showToast({ style: Toast.Style.Animated, title: "Creating branch", message: values.name });

      try {
        const branchResponse = await pscale.createABranch(
          { name: values.name, parent_branch: values.parent },
          { database, organization },
        );
        toast.title = "Branch created";
        toast.style = Toast.Style.Success;
        enrichToastWithURL(toast, { resource: "Branch", url: branchResponse.data.html_url });
      } catch (error) {
        if (error instanceof PlanetScaleError) {
          toast.title = "Failed to create deploy request";
          toast.message = error.data.message;
          toast.style = Toast.Style.Failure;
        } else {
          throw error;
        }
      }

      reset({ name: "", database: values.database, parent: values.parent });
    },
  });

  const [organization, database] = values.database.split("-");
  const { branches, branchesLoading } = useBranches({ organization, database });

  return (
    <Form
      enableDrafts={!props}
      isLoading={branchesLoading}
      navigationTitle="Create Branch"
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Create Branch" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <FormDatabaseDropdown storeValue title="Database" autoFocus={isEmpty(props)} {...itemProps.database} />
      <Form.Dropdown title="Parent" {...itemProps.parent} autoFocus={!isEmpty(props)}>
        {branches.map((branch) => (
          <Form.Dropdown.Item
            key={branch.name}
            icon={
              (branch as any).state === "sleeping"
                ? {
                    source: "branch-sleep.svg",
                    tintColor: Color.SecondaryText,
                  }
                : {
                    source: "branch.svg",
                    tintColor: PlanetScaleColor.Blue,
                  }
            }
            title={branch.name}
            value={branch.name}
          />
        ))}
      </Form.Dropdown>
      <Form.TextField title="Name" placeholder={placeholderBranchName} {...itemProps.name} />
    </Form>
  );
}

export default function Command() {
  return (
    <View>
      <CreateBranch />
    </View>
  );
}
