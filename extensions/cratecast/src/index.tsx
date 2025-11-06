import { Action, ActionPanel, Icon, List, getPreferenceValues, Keyboard } from "@raycast/api";
import { useState, useCallback } from "react";
import { Crate, getCrates } from "./api";
import Symbols from "./symbols";

enum CrateActions {
  copyToClipboard = "copyToClipboard",
  viewOnCratesIo = "viewOnCratesIo",
  openCrateDocumentation = "openCrateDocumentation",
  openHomepage = "openHomepage",
  openRepository = "openRepository",
  viewSymbols = "viewSymbols",
}

interface Preferences {
  defaultOpenAction: CrateActions;
}

function getShortcut(action: CrateActions, defaultAction: CrateActions): Keyboard.Shortcut | undefined {
  if (action == defaultAction) {
    return;
  }
  switch (action) {
    case CrateActions.copyToClipboard:
      return { modifiers: ["cmd"], key: "c" };
    case CrateActions.viewOnCratesIo:
      return { modifiers: ["cmd"], key: "o" };
    case CrateActions.openCrateDocumentation:
      return { modifiers: ["cmd"], key: "d" };
    case CrateActions.openHomepage:
      return { modifiers: ["cmd"], key: "h" };
    case CrateActions.openRepository:
      return { modifiers: ["cmd"], key: "r" };
    case CrateActions.viewSymbols:
      return { modifiers: ["cmd"], key: "i" };
  }
}

export default function Command() {
  const [crates, setCrates] = useState<Crate[]>([]);
  const [loading, setLoading] = useState(false);

  const { defaultOpenAction }: Preferences = getPreferenceValues();

  const getActions = useCallback(
    (
      name: string,
      version: string,
      crate: Crate,
      documentationURL?: string,
      homepageURL?: string,
      repositoryURL?: string,
    ) => {
      return [
        {
          actionName: CrateActions.copyToClipboard,
          action: (
            <Action.CopyToClipboard
              key={CrateActions.copyToClipboard}
              content={`${name} = "${version}"`}
              title="Copy Dependency Line"
              shortcut={getShortcut(CrateActions.copyToClipboard, defaultOpenAction)}
            />
          ),
        },
        {
          actionName: CrateActions.viewOnCratesIo,
          action: (
            <Action.OpenInBrowser
              key={CrateActions.viewOnCratesIo}
              url={`https://crates.io/crates/${name}`}
              title="View on crates.io"
              shortcut={getShortcut(CrateActions.viewOnCratesIo, defaultOpenAction)}
            />
          ),
        },
        {
          actionName: CrateActions.openCrateDocumentation,
          action: documentationURL && (
            <Action.OpenInBrowser
              key={CrateActions.openCrateDocumentation}
              url={documentationURL}
              title="Open Crate Documentation"
              shortcut={getShortcut(CrateActions.openCrateDocumentation, defaultOpenAction)}
            />
          ),
        },
        {
          actionName: CrateActions.openHomepage,
          action: homepageURL && (
            <Action.OpenInBrowser
              key={CrateActions.openHomepage}
              url={homepageURL}
              title="Open Homepage"
              shortcut={getShortcut(CrateActions.openHomepage, defaultOpenAction)}
            />
          ),
        },
        {
          actionName: CrateActions.openRepository,
          action: repositoryURL && (
            <Action.OpenInBrowser
              key={CrateActions.openRepository}
              url={repositoryURL}
              title="Open Repository"
              shortcut={getShortcut(CrateActions.openRepository, defaultOpenAction)}
            />
          ),
        },
        {
          actionName: CrateActions.viewSymbols,
          action: (
            <Action.Push
              key={CrateActions.viewSymbols}
              title="View Symbols"
              target={<Symbols crate={crate} />}
              shortcut={getShortcut(CrateActions.viewSymbols, defaultOpenAction)}
              icon={Icon.Info}
            />
          ),
        },
      ]
        .filter((item) => !!item.action)
        .sort((a) => {
          if (a.actionName == defaultOpenAction) {
            return -1;
          }
          return 0;
        })
        .map((item) => item.action);
    },
    [],
  );

  async function search(v: string): Promise<void> {
    setLoading(true);
    setCrates(await getCrates(v));
    setLoading(false);
  }

  function formatDownloads(downloads: number): string {
    if (downloads >= 1000000) return `${(downloads / 1000000).toFixed(1)}m`;
    if (downloads >= 1000) return `${(downloads / 1000).toFixed(1)}k`;
    return downloads.toLocaleString();
  }

  return (
    <List isLoading={loading} onSearchTextChange={search} searchBarPlaceholder="Search for a crate..." throttle>
      {crates.map((crate) => {
        const { id, name, version, downloads, documentationURL, homepageURL, repositoryURL, description } = crate;
        const actions = (
          <ActionPanel>{getActions(name, version, crate, documentationURL, homepageURL, repositoryURL)}</ActionPanel>
        );

        return (
          <List.Item
            id={id}
            key={id}
            icon={"icon.png"}
            title={name}
            subtitle={description}
            accessories={[
              {
                text: `v${version}`,
              },
              {
                icon: Icon.Download,
                text: formatDownloads(downloads),
                tooltip: `${downloads.toLocaleString()} downloads`,
              },
            ]}
            actions={actions}
          />
        );
      })}
    </List>
  );
}
