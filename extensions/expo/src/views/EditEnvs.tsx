import { showToast, Toast, Form, ActionPanel, Action, useNavigation, Icon } from "@raycast/api";
import { useForm, FormValidation } from "@raycast/utils";
import axios, { AxiosRequestConfig } from "axios";
import { EditAppleDeviceNameResponse } from "../lib/types/apple-devices.types";
import { BASE_URL } from "../lib/constants";
import { ErrorResponse } from "../lib/types";
import { EnvironmentVariablesItem } from "../lib/types/project-envs.types";
import useAuth from "../hooks/useAuth";

interface EditEnvPayload {
  name: string;
  value: string;
  visibility: "PUBLIC" | "SENSITIVE" | "SECRET";
  environments: Array<"DEVELOPMENT" | "PREVIEW" | "PRODUCTION">;
}
export default function EditEnv({ env, refreshEnvs }: { env: EnvironmentVariablesItem; refreshEnvs: () => void }) {
  const { authHeaders } = useAuth();
  const { pop } = useNavigation();

  const { handleSubmit } = useForm<EditEnvPayload>({
    onSubmit: async (values) => {
      const payload = {
        input: {
          id: env.id,
          ...values,
          type: env.type,
        },
      };

      const config: AxiosRequestConfig = {
        method: "post",
        maxBodyLength: Infinity,
        url: BASE_URL,
        headers: authHeaders,
        data: JSON.stringify([
          {
            operationName: "UpdateEnvironmentVariable",
            variables: payload,
            query:
              "mutation UpdateEnvironmentVariable($input: UpdateEnvironmentVariableInput!) {\n  environmentVariable {\n    updateEnvironmentVariable(environmentVariableData: $input) {\n      ...EnvironmentVariableData\n      __typename\n    }\n    __typename\n  }\n}\n\nfragment EnvironmentVariableData on EnvironmentVariable {\n  id\n  name\n  scope\n  value\n  environments\n  visibility\n  createdAt\n  updatedAt\n  type\n  isGlobal\n  fileName\n  apps {\n    id\n    name\n    slug\n    ownerAccount {\n      id\n      name\n      __typename\n    }\n    __typename\n  }\n  __typename\n}",
          },
        ]),
      };

      try {
        const resp = await axios.request<EditAppleDeviceNameResponse>(config);

        if ("errors" in resp.data) {
          console.log("++++++++++++++");

          const errorMessages = (resp.data as ErrorResponse).errors.map((error) => error.message).join(", ");
          showToast({
            title: "Failed to update enviroment variable",
            message: errorMessages,
            style: Toast.Style.Failure,
          });
        } else {
          refreshEnvs();
          showToast({ title: "Environment variable updated", message: "", style: Toast.Style.Success });
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
    },
  });

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Submit" onSubmit={handleSubmit} />
        </ActionPanel>
      }
      navigationTitle="Edit Enviroment Variable"
    >
      <Form.TextField id="name" title="Name" placeholder="" defaultValue={env.name} />

      <Form.TextField id="value" title="Value" placeholder="" defaultValue={env.value} />

      <Form.Dropdown id="visibility" title="Visibility" defaultValue={env.visibility}>
        <Form.Dropdown.Item value="PUBLIC" title="Public" icon={Icon.Text} />
        <Form.Dropdown.Item value="SENSITIVE" title="Senstive" icon={Icon.EyeDisabled} />
        <Form.Dropdown.Item value="SECRET" title="Secret" icon={Icon.Key} />
      </Form.Dropdown>

      <Form.TagPicker id="environments" title="Enviroment" defaultValue={env.environments}>
        {/* TODO: Confirm the source of enviroment options */}
        <Form.TagPicker.Item value="PREVIEW" title="Preview" />
        <Form.TagPicker.Item value="PRODUCTION" title="Production" />
        <Form.TagPicker.Item value="DEVELOPMENT" title="Development" />
      </Form.TagPicker>
    </Form>
  );
}
