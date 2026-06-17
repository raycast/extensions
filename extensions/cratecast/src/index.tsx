import { Action, ActionPanel, Icon, List, getPreferenceValues, Keyboard } from "@raycast/api";
import { useState, useCallback } from "react";
import { Crate, getCrates } from "./api";
import Symbols from "./symbols";

enum CrateActions {
  COPY_TO_CLIPBOARD = "copyToClipboard",
  VIEW_ON_CRATES_IO = "viewOnCratesIo",
  OPEN_CRATE_DOCUMENTATION = "openCrateDocumentation",
  OPEN_HOMEPAGE = "openHomepage",
  OPEN_REPOSITORY = "openRepository",
  VIEW_SYMBOLS = "viewSymbols",
}

interface Preferences {
  defaultOpenAction: CrateActions;
}

function getShortcut(action: CrateActions, defaultAction: CrateActions): Keyboard.Shortcut | undefined {
  if (action === defaultAction) {
    return;
  }
  switch (action) {
    case CrateActions.COPY_TO_CLIPBOARD:
      return { modifiers: ["cmd"], key: "c" };
    case CrateActions.VIEW_ON_CRATES_IO:
      return { modifiers: ["cmd"], key: "o" };
    case CrateActions.OPEN_CRATE_DOCUMENTATION:
      return { modifiers: ["cmd"], key: "d" };
    case CrateActions.OPEN_HOMEPAGE:
      return { modifiers: ["cmd"], key: "h" };
    case CrateActions.OPEN_REPOSITORY:
      return { modifiers: ["cmd"], key: "r" };
    case CrateActions.VIEW_SYMBOLS:
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
          actionName: CrateActions.COPY_TO_CLIPBOARD,
          action: (
            <Action.CopyToClipboard
              key={CrateActions.COPY_TO_CLIPBOARD}
              content={`${name} = "${version}"`}
              title="Copy Dependency Line"
              shortcut={getShortcut(CrateActions.COPY_TO_CLIPBOARD, defaultOpenAction)}
            />
          ),
        },
        {
          actionName: CrateActions.VIEW_ON_CRATES_IO,
          action: (
            <Action.OpenInBrowser
              key={CrateActions.VIEW_ON_CRATES_IO}
              url={`https://crates.io/crates/${name}`}
              title="View on crates.io"
              shortcut={getShortcut(CrateActions.VIEW_ON_CRATES_IO, defaultOpenAction)}
            />
          ),
        },
        {
          actionName: CrateActions.OPEN_CRATE_DOCUMENTATION,
          action: documentationURL && (
            <Action.OpenInBrowser
              key={CrateActions.OPEN_CRATE_DOCUMENTATION}
              url={documentationURL}
              title="Open Crate Documentation"
              shortcut={getShortcut(CrateActions.OPEN_CRATE_DOCUMENTATION, defaultOpenAction)}
            />
          ),
        },
        {
          actionName: CrateActions.OPEN_HOMEPAGE,
          action: homepageURL && (
            <Action.OpenInBrowser
              key={CrateActions.OPEN_HOMEPAGE}
              url={homepageURL}
              title="Open Homepage"
              shortcut={getShortcut(CrateActions.OPEN_HOMEPAGE, defaultOpenAction)}
            />
          ),
        },
        {
          actionName: CrateActions.OPEN_REPOSITORY,
          action: repositoryURL && (
            <Action.OpenInBrowser
              key={CrateActions.OPEN_REPOSITORY}
              url={repositoryURL}
              title="Open Repository"
              shortcut={getShortcut(CrateActions.OPEN_REPOSITORY, defaultOpenAction)}
            />
          ),
        },
        {
          actionName: CrateActions.VIEW_SYMBOLS,
          action: (
            <Action.Push
              key={CrateActions.VIEW_SYMBOLS}
              title="View Symbols"
              target={<Symbols crate={crate} />}
              shortcut={getShortcut(CrateActions.VIEW_SYMBOLS, defaultOpenAction)}
              icon={Icon.Info}
            />
          ),
        },
      ]
        .filter((item) => !!item.action)
        .sort((a) => {
          if (a.actionName === defaultOpenAction) {
            return -1;
          }
          return 0;
        })
        .map((item) => item.action);
    },
    [defaultOpenAction],
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
