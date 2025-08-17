import { showToast, Toast, Form, ActionPanel, Action, useNavigation, Icon } from "@raycast/api";
import { useForm, FormValidation } from "@raycast/utils";
import axios, { AxiosRequestConfig } from "axios";
import { EditAppleDeviceNameResponse } from "../lib/types/apple-devices.types";
import { BASE_URL } from "../lib/constants";
import { ErrorResponse } from "../lib/types";
import useAuth from "../hooks/useAuth";

interface CreateEnvPayload {
  name: string;
  value: string;
  visibility: "PUBLIC" | "SENSITIVE" | "SECRET";
  environments: Array<"DEVELOPMENT" | "PREVIEW" | "PRODUCTION">;
}
export default function CreateEnv({ refreshEnvs }: { refreshEnvs: () => void }) {
  const { authHeaders } = useAuth();
  const { pop } = useNavigation();

  const { handleSubmit } = useForm<CreateEnvPayload>({
    onSubmit: async (values) => {
      const config: AxiosRequestConfig = {
        method: "post",
        maxBodyLength: Infinity,
        url: BASE_URL,
        headers: authHeaders,
        data: JSON.stringify([
          {
            operationName: "CreateBulkEnvironmentVariableForApp",
            variables: {
              input: [
                {
                  ...values,
                  type: "STRING",
                },
              ],
              appId: "c616e5ba-f5e6-4e16-9f12-2c748a4b378f",
            },
            query:
              "mutation CreateBulkEnvironmentVariableForApp($input: [CreateEnvironmentVariableInput!]!, $appId: ID!) {\n  environmentVariable {\n    createBulkEnvironmentVariablesForApp(\n      environmentVariablesData: $input\n      appId: $appId\n    ) {\n      ...EnvironmentVariableData\n      __typename\n    }\n    __typename\n  }\n}\n\nfragment EnvironmentVariableData on EnvironmentVariable {\n  id\n  name\n  scope\n  value\n  environments\n  visibility\n  createdAt\n  updatedAt\n  type\n  isGlobal\n  fileName\n  apps {\n    id\n    name\n    slug\n    ownerAccount {\n      id\n      name\n      __typename\n    }\n    __typename\n  }\n  __typename\n}",
          },
        ]),
      };

      try {
        const resp = await axios.request<EditAppleDeviceNameResponse>(config);

        if ("errors" in resp.data) {
          const errorMessages = (resp.data as ErrorResponse).errors.map((error) => error.message).join(", ");
          showToast({
            title: "Failed to created enviroment variable",
            message: errorMessages,
            style: Toast.Style.Failure,
          });
        } else {
          refreshEnvs();
          showToast({ title: "Environment variable created", message: "", style: Toast.Style.Success });
          pop();
        }
      } catch (error) {
        showToast({
          title: "Failed to update device name",
          message: (error as Error).message || "",
          style: Toast.Style.Failure,
        });
      }
    },
    validation: {
      name: FormValidation.Required,
      value: FormValidation.Required,
      visibility: FormValidation.Required,
      environments: FormValidation.Required,
    },
  });

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Submit" onSubmit={handleSubmit} />
        </ActionPanel>
      }
      navigationTitle="Create Enviroment Variable"
      enableDrafts
    >
      <Form.TextField id="name" title="Name" placeholder="" />

      <Form.TextField id="value" title="Value" placeholder="" />

      <Form.Dropdown id="visibility" title="Visibility">
        <Form.Dropdown.Item value="PUBLIC" title="Public" icon={Icon.Text} />
        <Form.Dropdown.Item value="SENSITIVE" title="Senstive" icon={Icon.EyeDisabled} />
        <Form.Dropdown.Item value="SECRET" title="Secret" icon={Icon.Key} />
      </Form.Dropdown>

      <Form.TagPicker id="environments" title="Enviroment">
        {/* TODO: Confirm the source of enviroment options */}
        <Form.TagPicker.Item value="PREVIEW" title="Preview" />
        <Form.TagPicker.Item value="PRODUCTION" title="Production" />
        <Form.TagPicker.Item value="DEVELOPMENT" title="Development" />
      </Form.TagPicker>
    </Form>
  );
}
