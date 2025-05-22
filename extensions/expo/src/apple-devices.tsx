import { ActionPanel, List, Action, showToast, Toast, Icon } from "@raycast/api";
import { useFetch } from "@raycast/utils";
import { useEffect, useState } from "react";
import { BASE_URL } from "./lib/constants";
import { isObjectEmpty } from "./lib/utils";
import { ErrorResponse } from "./lib/types";
import { AppleDevicesResponse } from "./lib/types/apple-devices.types";
import EditAppleDevice from "./views/EditAppleDevice";
import AddAppleDevice from "./views/AddAppleDevice";
import AccountPicker from "./components/AccountPicker";
import AuthWrapper from "./components/AuthWrapper";
import useAuth from "./hooks/useAuth";

export default function Command() {
  const { authHeaders } = useAuth();

  const [accountName, setAccountName] = useState("");
  useEffect(() => {
    if (accountName) {
      revalidate();
    }
  }, [accountName]);

  const AppleDevicesPayload = JSON.stringify([
    {
      operationName: "AppleDevicesPaginatedQuery",
      variables: {
        accountName: accountName,
        first: 15,
        filter: {},
      },
      query:
        "query AppleDevicesPaginatedQuery($accountName: String!, $after: String, $first: Int, $before: String, $last: Int, $filter: AppleDeviceFilterInput) {\n  account {\n    byName(accountName: $accountName) {\n      id\n      appleDevicesPaginated(\n        after: $after\n        first: $first\n        before: $before\n        last: $last\n        filter: $filter\n      ) {\n        edges {\n          node {\n            ...AppleDeviceData\n            __typename\n          }\n          __typename\n        }\n        pageInfo {\n          hasNextPage\n          hasPreviousPage\n          startCursor\n          endCursor\n          __typename\n        }\n        __typename\n      }\n      __typename\n    }\n    __typename\n  }\n}\n\nfragment AppleDeviceData on AppleDevice {\n  __typename\n  id\n  appleTeam {\n    ...AppleTeamData\n    __typename\n  }\n  identifier\n  name\n  model\n  deviceClass\n  softwareVersion\n  enabled\n  createdAt\n}\n\nfragment AppleTeamData on AppleTeam {\n  id\n  appleTeamIdentifier\n  appleTeamName\n  __typename\n}",
    },
    {
      operationName: "AppleTeamsPaginatedByAccountQuery",
      variables: {
        first: 100,
        accountName: accountName,
      },
      query:
        "query AppleTeamsPaginatedByAccountQuery($accountName: String!, $after: String, $first: Int, $before: String, $last: Int) {\n  account {\n    byName(accountName: $accountName) {\n      id\n      appleTeamsPaginated(after: $after, first: $first, before: $before, last: $last) {\n        edges {\n          node {\n            ...AppleTeamData\n            __typename\n          }\n          __typename\n        }\n        pageInfo {\n          hasNextPage\n          hasPreviousPage\n          startCursor\n          endCursor\n          __typename\n        }\n        __typename\n      }\n      __typename\n    }\n    __typename\n  }\n}\n\nfragment AppleTeamData on AppleTeam {\n  id\n  appleTeamIdentifier\n  appleTeamName\n  __typename\n}",
    },
  ]);

  const { isLoading, data, revalidate } = useFetch(BASE_URL, {
    body: AppleDevicesPayload,
    method: "post",
    headers: authHeaders,
    execute: !isObjectEmpty(authHeaders),
    parseResponse: async (resp) => {
      const data = (await resp.json()) as AppleDevicesResponse;
      if ("errors" in data) {
        const errorMessages = (data as ErrorResponse).errors.map((error) => error.message).join(", ");
        showToast({ title: "Error Fetching Apple Devices", message: errorMessages, style: Toast.Style.Failure });
        return {
          teams: [],
          devices: [],
        };
      }

      const teams = data[1].data.account.byName.appleTeamsPaginated?.edges.map((edge) => ({ ...edge.node }));
      const devices = data[0].data.account.byName.appleDevicesPaginated?.edges
        .map((edge) => edge.node)
        .map((device) => ({ ...device, accountId: data[0].data.account.byName.id }));

      return {
        teams,
        devices,
      };
    },
    onError: (error) => {
      showToast({
        title: "Error fetching Apple Devices",
        message: (error as Error)?.message || "",
        style: Toast.Style.Failure,
      });
    },
    initialData: {
      teams: [],
      devices: [],
    },
  });

  useEffect(() => {
    revalidate();
  }, []);

  return (
    <AuthWrapper>
      <List
        isLoading={isLoading}
        navigationTitle="Apple Devices"
        isShowingDetail
        searchBarAccessory={<AccountPicker onPick={(acc) => setAccountName(acc.name)} />}
      >
        {data && data.devices ? (
          <>
            {data.devices.map((device) => (
              <List.Item
                key={device.identifier}
                icon={"phone.png"}
                title={device.name ? device.name : device.identifier || ""}
                detail={
                  <List.Item.Detail
                    metadata={
                      <List.Item.Detail.Metadata>
                        <List.Item.Detail.Metadata.Label title="Device ID" text={device.identifier} />
                        <List.Item.Detail.Metadata.Label title="Device Name" text={device.name ?? "N/A"} />
                        <List.Item.Detail.Metadata.Label
                          title="Device Type"
                          text={`${device.deviceClass} ${device.model}`}
                        />

                        <List.Item.Detail.Metadata.Separator />

                        <List.Item.Detail.Metadata.Label
                          title="Apple Team"
                          text={device.appleTeam?.appleTeamName ?? "N/A"}
                        />
                        <List.Item.Detail.Metadata.Label
                          title="Apple Team ID"
                          text={device.appleTeam?.appleTeamIdentifier ?? "N/A"}
                        />
                      </List.Item.Detail.Metadata>
                    }
                  ></List.Item.Detail>
                }
                actions={
                  <ActionPanel>
                    <Action.Push
                      title="Add New Device"
                      target={<AddAppleDevice appleTeamId={device.appleTeam?.id || ""} accountId={device.accountId} />}
                      icon={Icon.Plus}
                    />
                    <Action.Push
                      title="Edit Device Name"
                      target={<EditAppleDevice deviceId={device.id} refreshDevices={revalidate} />}
                      icon={Icon.Pencil}
                    />
                    <Action title="Delete Device" icon={Icon.Trash} />
                  </ActionPanel>
                }
              />
            ))}
          </>
        ) : (
          <List.EmptyView />
        )}
      </List>
    </AuthWrapper>
  );
}
