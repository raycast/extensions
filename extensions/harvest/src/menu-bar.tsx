import React from "react";
import { Cache, MenuBarExtra } from "@raycast/api";
import { useMyTimeEntries } from "./services/harvest";
import { HarvestTimeEntry } from "./services/responseTypes";

const cache = new Cache();

export function getCurrentTimerFromCache() {
  const running = cache.get("running");
  if (!running) return;
  return JSON.parse(running) as HarvestTimeEntry;
}

export default function MenuBar() {
  const { data, isLoading } = useMyTimeEntries();
  const [cacheLoading, setCacheLoading] = React.useState(true);

  const runningTimer = getCurrentTimerFromCache();

  React.useEffect(() => {
    if (data && !isLoading) {
      const found = data.find((o) => o.is_running);
      if (runningTimer?.id !== found?.id) {
        console.log("found new running timer!!");
      }
      found ? cache.set("running", JSON.stringify(found)) : cache.remove("running");
      setCacheLoading(false);
    }
  }, [data, isLoading]);

  return (
    <MenuBarExtra
      icon={{ source: "../assets/harvest-logo-icon.png" }}
      title={runningTimer ? runningTimer.hours.toString() : "not running"}
      isLoading={isLoading || cacheLoading}
    >
      <MenuBarExtra.Section title="Seen">
        <MenuBarExtra.Item
          title="Example Seen Pull Request"
          onAction={() => {
            console.log("seen pull request clicked");
          }}
        />
      </MenuBarExtra.Section>
      <MenuBarExtra.Item title="Unseen" />
      <MenuBarExtra.Item
        title="Example Unseen Pull Request"
        onAction={() => {
          console.log("unseen pull request clicked");
        }}
      />
    </MenuBarExtra>
  );
}
