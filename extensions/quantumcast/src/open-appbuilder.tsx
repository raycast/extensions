import { List, Action, ActionPanel } from "@raycast/api";
import { useState, useEffect } from "react";
import * as mongoose from "mongoose";
import { MarsApp } from "./types";
import marsappModel from "./schemas/marsapp";
import { mongoDB, mongoURL } from "./assets/preferences";
import { docUrlOpenAppBuilder, cloudflowAppBuilderUrl, cloudflowAppDetailsUrl } from "./assets/globals";

async function getApps() {
  const appsList: MarsApp[] = [];
  mongoose.set("strictQuery", false);
  await mongoose.connect(`${mongoURL}/${mongoDB}`);
  const apps = await marsappModel.find();
  mongoose.disconnect()

  apps.forEach((app) => {
    appsList.push({
      name: app.name ?? "-",
      version: app.version ?? "-",
      description: app.description ?? "-",
      you_are_owner: app.you_are_owner ?? false,
      owner: app.owner ?? "External Owner",
      documentation: app.documentation,
      landingPage: app.landingPage,
      icon: app.icon,
      minCloudflowVersion: app.minCloudflowVersion ?? "-",
      environments: app.environments,
    });
  });

  return appsList.sort((a, b) => {
    const nameA = a.name.toLowerCase();
    const nameB = b.name.toLowerCase();
    if (nameA < nameB) {
      return -1;
    }
    if (nameA > nameB) {
      return 1;
    }
    return 0;
  });
}

export default function Command() {
  const [apps, setApps] = useState<MarsApp[]>([]);

  useEffect(() => {
    const fetchApps = async () => {
      const data = await getApps();
      setApps(data);
    };
    fetchApps();
  }, []);

  return (
    <List
      navigationTitle="Open AppBuilder"
      searchBarPlaceholder="Select the MARS app you want to open in AppBuilder"
      isLoading={true}
      isShowingDetail={true}
    >
      {apps.map((app, idx) => (
        <List.Item
          id={app.name + `-${idx}`}
          key={app.name + `-${idx}`}
          title={app.name ?? "Undefined"}
          icon="../assets/quantumcast-extension-icon.png"
          detail={
            <List.Item.Detail
              metadata={
                <List.Item.Detail.Metadata>
                  <List.Item.Detail.Metadata.Label title="Description" text={`${app.description}`} />
                  <List.Item.Detail.Metadata.Separator />
                  <List.Item.Detail.Metadata.Label title="Name" text={`${app.name}`} />
                  <List.Item.Detail.Metadata.Separator />
                  <List.Item.Detail.Metadata.Label title="Installed Version" text={`${app.version}`} />
                  <List.Item.Detail.Metadata.Separator />
                  <List.Item.Detail.Metadata.Label title="Owner" text={`${app.owner}`} />
                  <List.Item.Detail.Metadata.Separator />
                  <List.Item.Detail.Metadata.Label
                    title="You are owner"
                    text={app.you_are_owner === true ? "✔" : "✕"}
                  />
                  <List.Item.Detail.Metadata.Separator />
                  <List.Item.Detail.Metadata.Label title="Min. Cloudflow Version" text={app.minCloudflowVersion} />
                  <List.Item.Detail.Metadata.Separator />
                  <List.Item.Detail.Metadata.Label
                    title="Environments"
                    text={app.environments?.length === 0 ? "-" : app.environments?.join(", ")}
                  />
                  <List.Item.Detail.Metadata.Separator />
                  <List.Item.Detail.Metadata.Label title="Documentation" text={app.documentation} />
                  <List.Item.Detail.Metadata.Separator />
                      <List.Item.Detail.Metadata.Link
                        title="Details Page"
                        target={`${cloudflowAppDetailsUrl}/${app.name}`}
                        text="Open in browser"
                      />
                  {app.landingPage !== undefined && (
                    <>
                      <List.Item.Detail.Metadata.Separator />
                      <List.Item.Detail.Metadata.Link
                        title="Landing Page"
                        target={app.landingPage}
                        text="Open in browser"
                      />
                    </>
                  )}
                </List.Item.Detail.Metadata>
              }
            />
          }
          actions={
            <ActionPanel title="Quantumcast - AppBuilder">
              <Action.OpenInBrowser url={`${cloudflowAppBuilderUrl}${encodeURIComponent(app.name)}`} />
              <Action.OpenInBrowser title="Open Details Page" url={`${cloudflowAppDetailsUrl}/${app.name}`} />
              {app.landingPage !== undefined && (
                <Action.OpenInBrowser title="Open Landing Page" url={app.landingPage} />
              )}
              <Action.OpenInBrowser title="Open Documentation" url={docUrlOpenAppBuilder} />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
