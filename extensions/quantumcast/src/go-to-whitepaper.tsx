import { Icon, List, Action, ActionPanel } from "@raycast/api";
import { useState, useEffect } from "react";
import * as mongoose from "mongoose";
import { Whitepaper } from "./types"
import whitepaperModel from "./schemas/whitepaper"
import { mongoDB, mongoURL, showSystemWhitepaper } from "./assets/preferences"
import { docUrlGoToWhitepaper, cloudflowWhitepaperUrl } from "./assets/globals"

async function getWhitepapers() {
  const whitepaperList: Whitepaper[] = [];
  mongoose.set('strictQuery', false);
  await mongoose.connect(`${mongoURL}/${mongoDB}`);
  const whitepapers = await whitepaperModel.find();

  mongoose.disconnect()

  whitepapers.forEach((flow) => {
    if (flow.name?.includes("Step Approval")) return;

    if (!showSystemWhitepaper) {
      // Only push non-system flows
      if (flow.system === undefined || flow.system === false)
        whitepaperList.push({
          name: flow.name ?? "Untitled",
          system: flow.system ?? false,
        });
    } else {
      // Push them all
      whitepaperList.push({
        name: flow.name ?? "Untitled",
        system: flow.system ?? false,
      });
    }
  });
  return whitepaperList.sort((a, b) => {
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
  const [whitepapers, setWhitepapers] = useState<Whitepaper[]>([]);

  useEffect(() => {
    const fetchCollections = async () => {
      const data = await getWhitepapers();
      setWhitepapers(data);
    };
    fetchCollections();
  }, []);

  return (
    <List
      navigationTitle="Go to whitepaper"
      searchBarPlaceholder="Select the whitepaper to open in your default browser"
      isLoading={true}
    >
      {whitepapers.map((whitepaper, idx) => (
        <List.Item
          id={whitepaper.name + `-${idx}`}
          key={whitepaper.name + `-${idx}`}
          title={whitepaper.name ?? "Undefined"}
          icon='../assets/quantumcast-extension-icon.png'
          accessories={[
            {
              text: whitepaper.system === false ? "Custom" : "System",
              icon: whitepaper.system === false ? Icon.Person : Icon.Gear,
            },
          ]}
          actions={
            <ActionPanel title="Quantumcast - Whitepaper">
              <Action.OpenInBrowser
                url={`${cloudflowWhitepaperUrl}${encodeURIComponent(whitepaper.name)}`}
              />
              <Action.OpenInBrowser title="Open Documentation" url={docUrlGoToWhitepaper} />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
