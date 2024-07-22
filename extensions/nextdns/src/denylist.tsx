import {
  ActionPanel,
  Action,
  showToast,
  Toast,
  getPreferenceValues,
  List,
  Icon,
  LaunchType,
  launchCommand,
  Keyboard,
  Color,
  Alert,
  confirmAlert,
} from "@raycast/api";
import { getApiClient, getProfileName } from "./libs/api";
import { DomainListItem } from "./types/nextdns";
import { useEffect, useState } from "react";
import { showFailureToast, useCachedState } from "@raycast/utils";

type DenylistStore = Record<string, boolean>;

export default function Command() {
  const [profileName, setProfileName] = useState<string>("Loading...");
  const [denylist, setDenylist] = useCachedState<DenylistStore | undefined>("deny-list");

  const preferences = getPreferenceValues<Preferences>();

  const endpoint = `/profiles/${preferences.nextdns_profile_id}/denylist`;
  const api = getApiClient();

  const handleSwitch = async (id: string, active: boolean) => {
    const idHex = Buffer.from(id).toString("hex");
    const patchEndpoint = `${endpoint}/hex:${idHex}`;

    const { status } = await api.patch(patchEndpoint, {
      active,
    });

    if (status === 204) {
      showToast({
        style: Toast.Style.Success,
        title: "Success",
        message: `Domain ${id} has been ${active ? "activated" : "deactivated"}`,
      });

      setDenylist({ ...denylist, [id]: active });
    } else {
      showToast({
        style: Toast.Style.Failure,
        title: "Something went wrong",
        message: `Please try again`,
      });
    }
  };

  const handleRemove = async (id: string) => {
    await confirmAlert({
      title: "Remove item",
      icon: Icon.Trash,
      message: `Are you sure you want to remove ${id}?`,
      rememberUserChoice: true,
      primaryAction: {
        title: "Remove",
        style: Alert.ActionStyle.Destructive,
        onAction: async () => {
          const idHex = Buffer.from(id).toString("hex");
          const deleteEndpoint = `${endpoint}/hex:${idHex}`;

          const { status } = await api.delete(deleteEndpoint);
          if (status === 204) {
            showToast({
              style: Toast.Style.Success,
              title: "Success",
              message: `Domain ${id} has been removed from the denylist`,
            });

            if (denylist) {
              const { [id]: _, ...rest } = denylist; // eslint-disable-line @typescript-eslint/no-unused-vars
              setDenylist(rest);
            }
          } else {
            showToast({
              style: Toast.Style.Failure,
              title: "Something went wrong",
              message: `Please try again`,
            });
          }
        },
      },
    });
  };

  useEffect(() => {
    (async () => {
      setProfileName(await getProfileName());

      await api.get(endpoint).then((response) => {
        if (response.status === 200) {
          const denylist = response.data.data as DomainListItem[];
          setDenylist(denylist.map((item) => ({ [item.id]: item.active })).reduce((a, b) => ({ ...a, ...b }), {}));
        } else {
          showToast({
            style: Toast.Style.Failure,
            title: "Error",
            message: "Could not fetch denylist",
          });
        }
      });
    })();
  }, []);

  return (
    <List searchBarPlaceholder={`Search denylist of ${profileName} (${preferences.nextdns_profile_id})`}>
      {denylist === undefined && <List.EmptyView title="Loading..." />}

      {denylist && Object.keys(denylist).length === 0 && (
        <List.EmptyView
          title="No domains in denylist"
          actions={
            <ActionPanel>
              <Action
                title="Add Domain to Allowlist"
                icon={Icon.PlusCircle}
                shortcut={{ modifiers: ["cmd"], key: "n" }}
                onAction={() => {
                  launchCommand({ name: "add-allowlist", type: LaunchType.UserInitiated });
                }}
              />
            </ActionPanel>
          }
        />
      )}

      {denylist &&
        Object.keys(denylist).length > 0 &&
        Object.entries(denylist).map(([id, active]) => (
          <List.Item
            id={id}
            key={id}
            title={`*.${id}`}
            icon={
              active
                ? { source: Icon.CheckCircle, tintColor: Color.Red }
                : { source: Icon.Circle, tintColor: Color.SecondaryText }
            }
            actions={
              <ActionPanel>
                <ActionPanel.Section>
                  {active && (
                    <Action
                      title="Deactivate Domain"
                      icon={Icon.XMarkCircle}
                      onAction={() => handleSwitch(id, false)}
                    />
                  )}
                  {!active && (
                    <Action title="Activate Domain" icon={Icon.CheckCircle} onAction={() => handleSwitch(id, true)} />
                  )}
                  <Action
                    title="Remove Domain"
                    icon={Icon.Trash}
                    onAction={() => handleRemove(id)}
                    shortcut={Keyboard.Shortcut.Common.Remove}
                    style={Action.Style.Destructive}
                  />
                </ActionPanel.Section>

                <Action
                  title="Add Domain to Denylist"
                  icon={Icon.PlusCircle}
                  shortcut={{ modifiers: ["cmd"], key: "n" }}
                  onAction={() => {
                    try {
                      launchCommand({ name: "add-denylist", type: LaunchType.UserInitiated });
                    } catch (error) {
                      showFailureToast(error);
                    }
                  }}
                />
              </ActionPanel>
            }
          />
        ))}
    </List>
  );
}
