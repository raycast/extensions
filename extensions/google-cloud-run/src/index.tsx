import { List, Icon, Color, getPreferenceValues, ActionPanel, Action, showToast, Toast } from "@raycast/api";
import { useExec } from "@raycast/utils";
import { useMemo, useState } from "react";

interface Preferences {
  gcloudPath: string;
  region?: string;
}

interface Service {
  metadata: { name: string };
  status: { traffic: [{ revisionName: string; tag?: string; url: string; percent?: number }] };
}

interface Revision {
  metadata: { name: string };
}
const greenCheckmark = { source: Icon.Checkmark, tintColor: Color.Green };

export default function Command() {
  const { gcloudPath, region } = getPreferenceValues<Preferences>();

  const [serviceId, setServiceId] = useState<string>("");

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
    { initialData: "[]", execute: false },
  );
  const servicesExec = useExec(gcloudPath, ["run", "services", "list", "--format=json"], {
    initialData: "[]",
    execute: false,
    onError: () => {
      showToast({
        style: Toast.Style.Failure,
        title: "Error fetching services",
        message: "Please ensure you have the correct permissions to list services.",
      });
    },
  });

  useExec(gcloudPath, ["--version"], {
    execute: true,
    onError: () => {
      showToast({
        style: Toast.Style.Failure,
        title: "gcloud CLI Path Error",
        message: "Please install Google Cloud CLI and check your gcloud CLI path in preferences.",
      });
    },
    onData: () => {
      servicesExec.revalidate();
      revisionsExec.revalidate();
    },
  });

  const services = useMemo<Service[]>(() => JSON.parse(servicesExec.data || "{}"), [servicesExec.data]);
  const revisions = useMemo<Revision[]>(() => JSON.parse(revisionsExec.data || "{}"), [revisionsExec.data]);

  const getService = (serviceId: string) => {
    return services.find((s) => s.metadata.name === serviceId);
  };
  const getTraffic = (revisionName: string) => {
    const tr = getService(serviceId)?.status.traffic;
    const revision = tr?.find((t) => t.revisionName === revisionName);
    return revision;
  };

  const ServicesDropdown = (
    <List.Dropdown
      isLoading={servicesExec.isLoading}
      tooltip="Select service"
      storeValue={true}
      onChange={(value) => setServiceId(value)}
    >
      <List.Dropdown.Section title="Services">
        {services.map((s) => (
          <List.Dropdown.Item key={s.metadata.name} title={s.metadata.name} value={s.metadata.name} />
        ))}
      </List.Dropdown.Section>
    </List.Dropdown>
  );

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
            icon={!currentTraffic ? Icon.Xmark : currentTraffic.percent === 100 ? greenCheckmark : Icon.Checkmark}
            key={rName}
            title={rName}
            accessories={[{ tag: currentTraffic?.tag || "" }]}
            actions={<ListActions newRevision={rName} serviceId={serviceId} />}
          />
        );
      })}
    </List>
  );
}

function ListActions(props: { newRevision: string; serviceId: string }) {
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
  };

  return (
    <ActionPanel>
      <Action title="Migrate Traffic" onAction={handleMigrateTraffic} />
    </ActionPanel>
  );
}
