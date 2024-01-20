import {
  ActionPanel,
  Action,
  showToast,
  Toast,
  getPreferenceValues,
  List,
  Icon,
  launchCommand,
  LaunchType,
} from "@raycast/api";
import { getApiClient, getProfileName } from "./libs/api";
import { DomainListItem } from "./types/nextdns";
import { useEffect, useState } from "react";

type AllowlistStore = Record<string, boolean>;

export default function Command() {
  const [profileName, setProfileName] = useState<string>("Loading...");
  const [allowlist, setAllowlist] = useState<AllowlistStore | undefined>();

  const preferences = getPreferenceValues<Preferences>();

  const endpoint = `/profiles/${preferences.nextdns_profile_id}/allowlist`;
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

      setAllowlist({ ...allowlist, [id]: active });
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

      if (allowlist) {
        const { [id]: _, ...rest } = allowlist;
        setAllowlist(rest);
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
          const allowlist = response.data.data as DomainListItem[];
          setAllowlist(allowlist.map((item) => ({ [item.id]: item.active })).reduce((a, b) => ({ ...a, ...b }), {}));
        } else {
          showToast({
            style: Toast.Style.Failure,
            title: "Error",
            message: "Could not fetch allowlist",
          });
        }
      });
    })();
  }, []);

  return (
    <List searchBarPlaceholder={`Search allowlist of ${profileName} (${preferences.nextdns_profile_id})`}>
      {allowlist === undefined && <List.EmptyView title="Loading..." />}

      {allowlist && Object.keys(allowlist).length === 0 && (
        <List.EmptyView
          title="No domains in allowlist"
          actions={
            <ActionPanel>
              <Action
                title="Add domain to allowlist"
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

      {allowlist &&
        Object.keys(allowlist).length > 0 &&
        Object.entries(allowlist).map(([id, active]) => (
          <List.Item
            id={id}
            key={id}
            title={`*.${id}`}
            icon={active ? Icon.CheckCircle : Icon.Circle}
            actions={
              <ActionPanel title={`Manage ${id}`}>
                <ActionPanel.Section>
                  {active && (
                    <Action
                      title="Deactivate domain"
                      icon={Icon.XMarkCircle}
                      onAction={() => handleSwitch(id, false)}
                    />
                  )}
                  {!active && (
                    <Action title="Activate domain" icon={Icon.CheckCircle} onAction={() => handleSwitch(id, true)} />
                  )}
                  <Action title="Remove domain" icon={Icon.Trash} onAction={() => handleRemove(id)} />
                </ActionPanel.Section>

                <Action
                  title="Add domain to allowlist"
                  icon={Icon.PlusCircle}
                  shortcut={{ modifiers: ["cmd"], key: "n" }}
                  onAction={() => {
                    launchCommand({ name: "add-allowlist", type: LaunchType.UserInitiated });
                  }}
                />
              </ActionPanel>
            }
          />
        ))}
    </List>
  );
}
