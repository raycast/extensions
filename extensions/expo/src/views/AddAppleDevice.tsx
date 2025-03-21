import { Action, ActionPanel, Grid, Icon, showToast, Toast } from "@raycast/api";
import { useEffect, useState } from "react";
import { getAuthHeaders } from "../lib/utils";
import QRCode from "qrcode";
import { useFetch } from "@raycast/utils";
import { BASE_URL } from "../lib/constants";
import { ErrorResponse } from "../lib/types";
import { RegisterAppleDeviceResponse } from "../lib/types/apple-devices.types";

export default function AddAppleDevice({ appleTeamId, accountId }: { appleTeamId: string; accountId: string }) {
  const [headers, setHeaders] = useState<Record<string, string>>({});
  const [qr, setQr] = useState("");

  const RegisterDevicePayload = JSON.stringify([
    {
      operationName: "CreateAppleDeviceRegistrationRequestMutation",
      variables: {
        appleTeamId: appleTeamId,
        accountId: accountId,
      },
      query:
        "mutation CreateAppleDeviceRegistrationRequestMutation($appleTeamId: ID!, $accountId: ID!) {\n  appleDeviceRegistrationRequest {\n    createAppleDeviceRegistrationRequest(\n      appleTeamId: $appleTeamId\n      accountId: $accountId\n    ) {\n      id\n      ...AppleDeviceRegistrationRequestData\n      __typename\n    }\n    __typename\n  }\n}\n\nfragment AppleDeviceRegistrationRequestData on AppleDeviceRegistrationRequest {\n  __typename\n  id\n}",
    },
  ]);

  const { isLoading, data } = useFetch(BASE_URL, {
    body: RegisterDevicePayload,
    method: "post",
    headers: headers || {},
    execute: headers === null ? false : true,
    parseResponse: async (resp) => {
      const data = (await resp.json()) as RegisterAppleDeviceResponse;
      if ("errors" in data) {
        const errorMessages = (data as ErrorResponse).errors.map((error) => error.message).join(", ");
        showToast({ title: "Error Fetching Register Code", message: errorMessages, style: Toast.Style.Failure });
        return null;
      }

      const addId = data[0].data.appleDeviceRegistrationRequest.createAppleDeviceRegistrationRequest.id;

      const url = `https://expo.dev/register-device/${addId}`;

      QRCode.toDataURL(url, function (err, url) {
        console.log(url);
        setQr(url);
      });

      return url;
    },
    onError: (error) => {
      console.log(error);
      showToast({
        title: "Error Fetching Register Code",
        message: (error as Error)?.message || "",
        style: Toast.Style.Failure,
      });
    },
    initialData: null,
  });

  useEffect(() => {
    async function fetchHeaders() {
      const authHeaders = await getAuthHeaders();
      setHeaders(authHeaders);
    }
    fetchHeaders();
  }, []);

  return (
    <Grid
      searchBarPlaceholder="Scan the following QR code with an iOS device to register it with Expo."
      isLoading={isLoading}
      columns={2}
      inset={Grid.Inset.Zero}
      navigationTitle="Add Apple Device"
    >
      {[data].map((item) => (
        <Grid.Item
          key={item}
          content={{
            source: qr,
          }}
          actions={
            <ActionPanel>
              <Action.CopyToClipboard content={data || ""} title="Copy Link" icon={Icon.CopyClipboard} />
            </ActionPanel>
          }
        />
      ))}
    </Grid>
  );
}
