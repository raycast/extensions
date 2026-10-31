import { Action, ActionPanel, Icon, List } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { useState } from "react";
import { buildURL, launcherApps } from "./lib/contract";
import { loadLibrary } from "./lib/glimmer";
import {
  ErrorView,
  ignoreErrorToast,
  NoPCs,
  openGlimmer,
  PCControls,
  stateAccessory,
  streamWithToast,
} from "./components/shared";

export default function StreamApp() {
  const [visibility, setVisibility] = useState("visible");
  const { data, error, isLoading, revalidate } = useCachedPromise(loadLibrary, [], {
    onError: ignoreErrorToast,
  });
  if (error) return <ErrorView error={error} refresh={revalidate} />;

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Search apps or PCs…"
      searchBarAccessory={
        <List.Dropdown tooltip="App visibility" value={visibility} onChange={setVisibility} storeValue>
          <List.Dropdown.Item title="Visible apps" value="visible" />
          <List.Dropdown.Item title="All apps" value="all" />
        </List.Dropdown>
      }
    >
      {!data?.length && !isLoading ? <NoPCs /> : null}
      {data?.map(({ pc, apps: allApps, error: pcError }) => {
        const apps = launcherApps(allApps, visibility === "all");
        return (
          <List.Section key={pc.id} title={pc.name} subtitle={pcError ? "Apps unavailable" : undefined}>
            {apps.length === 0 ? (
              <List.Item
                id={pc.id}
                title={pc.name}
                subtitle={pcError ?? (allApps.length ? "Choose All apps to show hidden apps" : "No apps available")}
                icon={Icon.Desktop}
                accessories={[stateAccessory(pc, !!pcError)]}
                actions={
                  <ActionPanel>
                    {pc.state === "asleep" ? (
                      <Action title="Wake and Stream" icon={Icon.Play} onAction={() => streamWithToast(pc)} />
                    ) : pc.runningApp ? (
                      <Action title="Resume" icon={Icon.Play} onAction={() => streamWithToast(pc)} />
                    ) : null}
                    <PCControls pc={pc} refresh={revalidate} />
                    <Action.CopyToClipboard title="Copy link" content={buildURL("stream", pc.id)} />
                    <Action.CreateQuicklink
                      quicklink={{ name: `Stream on ${pc.name}`, link: buildURL("stream", pc.id) }}
                    />
                  </ActionPanel>
                }
              />
            ) : (
              apps.map((app) => {
                let url: string | undefined;
                try {
                  url = buildURL("stream", pc.id, app.name);
                } catch {
                  // Glimmer can list names containing controls that its URL parser rejects.
                }
                const icon =
                  app.name.toLowerCase() === "steam"
                    ? "steam.svg"
                    : app.name.toLowerCase() === "desktop"
                      ? Icon.Desktop
                      : Icon.GameController;
                return (
                  <List.Item
                    key={app.id}
                    id={`${pc.id}/${app.id}`}
                    title={app.name}
                    subtitle={url ? undefined : "Open in Glimmer; this name cannot be used in a link"}
                    keywords={[pc.name]}
                    icon={icon}
                    accessories={[
                      ...(app.running ? [{ text: "Running", icon: Icon.Play }] : []),
                      ...(app.hidden ? [{ text: "Hidden on the PC" }] : []),
                      ...(app.hdr ? [{ text: "HDR" }] : []),
                      stateAccessory(pc),
                    ]}
                    actions={
                      <ActionPanel>
                        {url ? (
                          <Action
                            title={pc.state === "asleep" ? "Wake and Stream" : app.running ? "Resume" : "Stream"}
                            icon={Icon.Play}
                            onAction={() => streamWithToast(pc, app.name)}
                          />
                        ) : (
                          <Action title="Open Glimmer" icon="extension-icon.png" onAction={openGlimmer} />
                        )}
                        <PCControls pc={pc} refresh={revalidate} />
                        {url ? (
                          <>
                            <Action.CopyToClipboard title="Copy link" content={url} />
                            <Action.CreateQuicklink quicklink={{ name: `${app.name} on ${pc.name}`, link: url }} />
                          </>
                        ) : null}
                      </ActionPanel>
                    }
                  />
                );
              })
            )}
          </List.Section>
        );
      })}
    </List>
  );
}
