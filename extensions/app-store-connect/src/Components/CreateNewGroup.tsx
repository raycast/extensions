import { Action, ActionPanel, Form, showToast, Toast } from "@raycast/api";
import { useForm, FormValidation } from "@raycast/utils";
import { fetchAppStoreConnect } from "../Hooks/useAppStoreConnect";
import { presentError } from "../Utils/utils";
import { App, BetaGroup, betaGroupSchema } from "../Model/schemas";
import { useState } from "react";

interface Props {
  app: App;
  didCreateNewGroup: (newGroup: BetaGroup) => void;
}
interface CreateNewGroupFormValues {
  isInternal: boolean;
  hasAccessToAllBuilds: boolean;
  name: string;
}
export default function CreateNewGroup({ app, didCreateNewGroup }: Props) {
  const [isLoading, setIsLoading] = useState(false);
  const { handleSubmit, itemProps, values } = useForm<CreateNewGroupFormValues>({
    onSubmit(values) {
      (async () => {
        setIsLoading(true);
        try {
          const response = await fetchAppStoreConnect(`/betaGroups`, "POST", {
            data: {
              type: "betaGroups",
              relationships: {
                app: {
                  data: {
                    type: "apps",
                    id: app.id,
                  },
                },
              },
              attributes: {
                name: values.name,
                isInternalGroup: values.isInternal,
                hasAccessToAllBuilds: values.hasAccessToAllBuilds,
              },
            },
          });
          setIsLoading(false);
          showToast({
            style: Toast.Style.Success,
            title: "Success!",
            message: "Created group",
          });
          if (response && response.ok) {
            const json = await response.json();
            const newGroup = betaGroupSchema.safeParse(json.data);
            if (newGroup.success) {
              didCreateNewGroup(json.data);
            }
          }
        } catch (error) {
          setIsLoading(false);
          presentError(error);
        }
      })();
    },
    initialValues: {
      isInternal: true,
      hasAccessToAllBuilds: false,
    },
    validation: {
      name: FormValidation.Required,
    },
  });
  return (
    <Form
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title={values.isInternal ? "Create Internal Group" : "Create External Group"}
            onSubmit={handleSubmit}
          />
        </ActionPanel>
      }
    >
      <Form.TextField title="Group name" placeholder="Enter group name" {...itemProps.name} />
      <Form.Checkbox
        label="Internal"
        {...itemProps.isInternal}
        info="Check to create an internal group, otherwise an external group will be created"
      />
      {itemProps.isInternal.value && (
        <Form.Checkbox
          label="Has access to all builds"
          {...itemProps.hasAccessToAllBuilds}
          info="Check to give access to all builds, otherwise only builds that are in the group will be accessible. Can not be changed after the group is created."
        />
      )}
    </Form>
  );
}
