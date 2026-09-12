import { List, Icon, Color, getPreferenceValues, ActionPanel, Action, showToast, Toast } from "@raycast/api";
import { useExec } from "@raycast/utils";
import { useMemo, useState } from "react";

interface Service {
  metadata: { name: string };
  status: { traffic: [{ revisionName?: string; tag?: string; url?: string; percent?: number }] };
}
interface Revision {
  metadata: { name: string };
}
const greenCheckmark = { source: Icon.Checkmark, tintColor: Color.Green };

export default function Command() {
  const { gcloudPath, region } = getPreferenceValues<Preferences>();

  const [serviceId, setServiceId] = useState<string>("");
  const [revisions, setRevisions] = useState<Revision[]>([]);

  //   const revisions = useMemo<Revision[]>(() => JSON.parse(revisionsExec.data || "{}"), [revisionsExec.data]);

  const servicesExec = useExec(
    gcloudPath,
    ["run", "services", "list", "--format=json(metadata.name, status.traffic)"],
    {
      keepPreviousData: true,
      initialData: "[]",
      onError: () => {
        showToast({
          style: Toast.Style.Failure,
          title: "Error fetching services",
          message: "Please ensure you have the correct permissions to list services.",
        });
      },
    },
  );

  const revisionsExec = useExec(
    gcloudPath,
    [
      "run",
      "revisions",
      "list",
      "--limit",
      "25",
      `--service=${serviceId}`,
      `${region ? "--region=" + region : ""}`,
      "--format=json",
    ],
    {
      keepPreviousData: true,
      initialData: "[]",
      onData: (data) => setRevisions(JSON.parse(data)),
      onError: () => {
        showToast({
          style: Toast.Style.Failure,
          title: "Error fetching revisions",
          message: "Please ensure you have the correct permissions to list revisions.",
        });
      },
    },
  );

  const services = useMemo<Service[]>(() => JSON.parse(servicesExec.data || "{}"), [servicesExec.data]);

  const getTraffic = (revisionName: string) => {
    const tr = services.find((s) => s.metadata.name === serviceId)?.status.traffic;
    const revision = tr?.find((t) => t.revisionName === revisionName);
    return revision;
  };

  const ServicesDropdown = (
    <List.Dropdown
      isLoading={servicesExec.isLoading}
      tooltip="Select service"
      storeValue={true}
      onChange={setServiceId}
    >
      <List.Dropdown.Section title="Services">
        {services.map((s) => (
          <List.Dropdown.Item key={s.metadata.name} title={s.metadata.name} value={s.metadata.name} />
        ))}
      </List.Dropdown.Section>
    </List.Dropdown>
  );

  const getIcon = (currentTraffic?: { revisionName?: string; tag?: string; url?: string; percent?: number }) => {
    if (!currentTraffic) return Icon.Xmark;
    if (currentTraffic.percent === 100) return greenCheckmark;
    return Icon.Checkmark;
  };

  return (
    <List
      isLoading={revisionsExec.isLoading || servicesExec.isLoading}
      searchBarAccessory={ServicesDropdown}
      searchBarPlaceholder="Search revisions..."
    >
      {revisions.map((r) => {
        const rName = r.metadata.name;
        const currentTraffic = getTraffic(rName);
        return (
          <List.Item
            icon={getIcon(currentTraffic)}
            key={rName}
            title={rName}
            accessories={[{ tag: currentTraffic?.tag ?? "" }]}
            actions={<ListActions newRevision={rName} serviceId={serviceId} revalTraffic={servicesExec.revalidate} />}
          />
        );
      })}
    </List>
  );
}

function ListActions(props: Readonly<{ newRevision: string; serviceId: string; revalTraffic: () => void }>) {
  const { gcloudPath, region } = getPreferenceValues<Preferences>();
  const { revalidate } = useExec(
    gcloudPath,
    [
      "run",
      "services",
      "update-traffic",
      `${region ? "--region=" + region : ""}`,
      `${props.serviceId}`,
      `--to-revisions=${props.newRevision}=100`,
    ],
    {
      execute: false,
    },
  );

  const handleMigrateTraffic = async () => {
    const toast = await showToast({ style: Toast.Style.Animated, title: "Migrating traffic..." });
    await revalidate();
    toast.style = Toast.Style.Success;
    toast.title = "Migrated traffic to revision";
    props.revalTraffic();
  };

  return (
    <ActionPanel>
      <Action title="Migrate Traffic" onAction={handleMigrateTraffic} />
    </ActionPanel>
  );
}
