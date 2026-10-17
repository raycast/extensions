import { Icon, launchCommand, LaunchType, MenuBarExtra, open, openExtensionPreferences } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { api, connectionKey, Counts } from "./api";

const DASHBOARD = "https://app.babav.co";

export default function MenuBar() {
  const { data: key, isLoading: keyLoading } = usePromise(connectionKey, []);
  const { data, isLoading, error } = usePromise(async (k?: string) => (k ? api<Counts>("/counts") : undefined), [key]);
  const total = data ? data.hot_leads + data.missed_calls + data.waiting_approval : 0;
  const go = (name: string) => () => launchCommand({ name, type: LaunchType.UserInitiated });
  return (
    <MenuBarExtra
      isLoading={keyLoading || isLoading}
      icon="icon.png"
      title={total > 0 ? String(total) : undefined}
      tooltip="BABAV"
    >
      {!keyLoading && !key ? (
        <MenuBarExtra.Item title="Connect your BABAV account" icon={Icon.Plug} onAction={go("find-person")} />
      ) : null}
      {key && error ? (
        <MenuBarExtra.Item
          title="Could not reach BABAV — check your key"
          icon={Icon.Warning}
          onAction={() => openExtensionPreferences()}
        />
      ) : null}
      {data ? <MenuBarExtra.Section title={data.brand} /> : null}
      <MenuBarExtra.Section>
        <MenuBarExtra.Item
          icon={Icon.Temperature}
          title="Hot leads"
          subtitle={String(data?.hot_leads ?? "–")}
          onAction={go("hot-leads")}
        />
        <MenuBarExtra.Item
          icon={Icon.Phone}
          title="Missed calls"
          subtitle={String(data?.missed_calls ?? "–")}
          onAction={() => open(`${DASHBOARD}/#phone`)}
        />
        <MenuBarExtra.Item
          icon={Icon.CheckCircle}
          title="Waiting for approval"
          subtitle={String(data?.waiting_approval ?? "–")}
          onAction={go("approve-queue")}
        />
      </MenuBarExtra.Section>
      <MenuBarExtra.Section>
        <MenuBarExtra.Item icon={Icon.Globe} title="Open BABAV" onAction={() => open(DASHBOARD)} />
        <MenuBarExtra.Item icon={Icon.Switch} title="Switch Brand" onAction={go("switch-brand")} />
      </MenuBarExtra.Section>
    </MenuBarExtra>
  );
}
