import { showToast, Toast, Form, ActionPanel, Action, useNavigation } from "@raycast/api";
import { useForm, FormValidation } from "@raycast/utils";
import axios, { AxiosRequestConfig } from "axios";
import { EditAppleDeviceNameResponse } from "../lib/types/apple-devices.types";
import { useEffect, useState } from "react";
import { getAuthHeaders } from "../lib/utils";
import { BASE_URL } from "../lib/constants";
import { ErrorResponse } from "../lib/types";

interface EditPayload {
  deviceName: string;
}
export default function EditAppleDevice({
  deviceId,
  refreshDevices,
}: {
  deviceId: string;
  refreshDevices: () => void;
}) {
  const [headers, setHeaders] = useState<Record<string, string>>({});
  const { pop } = useNavigation();

  const { handleSubmit, itemProps } = useForm<EditPayload>({
    onSubmit: async (values) => {
      console.log({ values });

      console.log({ deviceId });

      const config: AxiosRequestConfig = {
        method: "post",
        maxBodyLength: Infinity,
        url: BASE_URL,
        headers,
        data: JSON.stringify([
          {
            operationName: "UpdateAppleDevice",
            variables: {
              input: {
                name: values.deviceName,
              },
              deviceId,
            },
            query:
              "mutation UpdateAppleDevice($deviceId: ID!, $input: AppleDeviceUpdateInput!) {\n  appleDevice {\n    updateAppleDevice(id: $deviceId, appleDeviceUpdateInput: $input) {\n      ...AppleDeviceData\n      __typename\n    }\n    __typename\n  }\n}\n\nfragment AppleDeviceData on AppleDevice {\n  __typename\n  id\n  appleTeam {\n    ...AppleTeamData\n    __typename\n  }\n  identifier\n  name\n  model\n  deviceClass\n  softwareVersion\n  enabled\n  createdAt\n}\n\nfragment AppleTeamData on AppleTeam {\n  id\n  appleTeamIdentifier\n  appleTeamName\n  __typename\n}",
          },
        ]),
      };
      console.log(config);
      try {
        const resp = await axios.request<EditAppleDeviceNameResponse>(config);
        console.log(resp.data);

        if ("errors" in resp.data) {
          const errorMessages = (resp.data as ErrorResponse).errors.map((error) => error.message).join(", ");
          showToast({ title: "Failed to update device name", message: errorMessages, style: Toast.Style.Failure });
        } else {
          refreshDevices();
          showToast({ title: "Device name updated", message: "", style: Toast.Style.Success });
          pop();
        }
      } catch (error) {
        console.log(error);
        showToast({
          title: "Failed to update device name",
          message: (error as Error).message || "",
          style: Toast.Style.Failure,
        });
      }
    },
    validation: {
      deviceName: FormValidation.Required,
    },
  });

  useEffect(() => {
    async function fetchHeaders() {
      const authHeaders = await getAuthHeaders();
      setHeaders(authHeaders);
    }
    fetchHeaders();
  }, []);

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Submit" onSubmit={handleSubmit} />
        </ActionPanel>
      }
      navigationTitle="Edit Device Name"
    >
      <Form.TextField title="Device Name" placeholder="" {...itemProps.deviceName} />
    </Form>
  );
}
