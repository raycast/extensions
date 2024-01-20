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
} from "@raycast/api";
import { getApiClient, getProfileName } from "./libs/api";
import { DomainListItem } from "./types/nextdns";
import { useEffect, useState } from "react";

type DenylistStore = Record<string, boolean>;

export default function Command() {
  const [profileName, setProfileName] = useState<string>("Loading...");
  const [denylist, setDenylist] = useState<DenylistStore | undefined>();

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

      // optimistic update
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
    const idHex = Buffer.from(id).toString("hex");
    const deleteEndpoint = `${endpoint}/hex:${idHex}`;

    const { status } = await api.delete(deleteEndpoint);
    if (status === 204) {
      showToast({
        style: Toast.Style.Success,
        title: "Success",
        message: `Domain ${id} has been removed from the allowlist`,
      });

      if (denylist) {
        const { [id]: _, ...rest } = denylist;
        setDenylist(rest);
      }
    } else {
      showToast({
        style: Toast.Style.Failure,
        title: "Something went wrong",
        message: `Please try again`,
      });
    }
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
            icon={active ? Icon.CheckCircle : Icon.Circle}
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
                  <Action title="Remove Domain" icon={Icon.Trash} onAction={() => handleRemove(id)} />
                </ActionPanel.Section>

                <Action
                  title="Add Domain to Denylist"
                  icon={Icon.PlusCircle}
                  shortcut={{ modifiers: ["cmd"], key: "n" }}
                  onAction={() => {
                    launchCommand({ name: "add-denylist", type: LaunchType.UserInitiated });
                  }}
                />
              </ActionPanel>
            }
          />
        ))}
    </List>
  );
}
