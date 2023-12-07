import React from "react";
import { DB } from "./db";
import { usePromise } from "@raycast/utils";
import { ActionPanel, getApplications, Grid, Icon } from "@raycast/api";
import { IconActions } from "./components/actions/icon-actions";
import { COLUMNS } from "./api";

function formatDate(dateString: string) {
  const date = new Date(dateString);

  return (
    `􀧞 ${date.toLocaleDateString(undefined, {
      month: "2-digit",
      day: "2-digit",
    })} ` + `${date.toLocaleTimeString()}`
  );
}

export default function HistoryCommand() {
  const { data: historyData, isLoading } = usePromise(DB.getHistory);
  const { data: allApps } = usePromise(getApplications);

  const availableApps = allApps
    ?.filter((app) => Object.keys(historyData ?? {}).includes(app.bundleId!))
    .sort((a, b) =>
      a.name.toLocaleLowerCase().localeCompare(b.name.toLocaleLowerCase()),
    );

  // const [selectedAppName, setSelectedAppName] = useState<string>();
  // const selectedIcons = selectedAppName ? historyData?.[selectedAppName] : [];

  return (
    <Grid columns={COLUMNS} inset={Grid.Inset.Small} isLoading={isLoading}>
      {(availableApps ?? []).map((app) => (
        <Grid.Section title={app.name} key={app.bundleId}>
          {(historyData?.[app.bundleId!] ?? []).map((icon) => (
            <Grid.Item
              content={{
                source: icon.lowResPngUrl,
                fallback: Icon.DeleteDocument,
              }}
              title={formatDate(icon.date)}
              subtitle={`${icon.appName}`}
              key={icon.objectID}
              actions={
                <ActionPanel>
                  <IconActions icon={icon} />
                </ActionPanel>
              }
            />
          ))}
        </Grid.Section>
      ))}
      <Grid.EmptyView />
    </Grid>
  );
}
