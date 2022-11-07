import { homedir } from "os";
import { basename } from "path";

import { Action, ActionPanel, Color, Icon, List, getPreferenceValues, popToRoot } from "@raycast/api";
import { useEffect, useState } from "react";

import mdfind from "mdfind";
import moment from "moment";

import { copyRecentToClipboard, showInfoInFinder, maybeMoveResultToTrash } from "./utils";

import { Scope, ScopeDictionary, SpotlightResult } from "./types";

interface RecentsPreferences {
  limit: string;
  excludeFolders: boolean;
}

const queryScopesSharedQueryPart = (excludeFolders: boolean) =>
  `(kMDItemLastUsedDate = "*") && ((kMDItemContentTypeTree = public.content) || (kMDItemContentTypeTree = "com.microsoft.*"cdw) || (kMDItemContentTypeTree = public.archive) ${
    !excludeFolders ? `|| (kMDItemContentTypeTree = public.folder)` : ""
  }) && (kMDItemSupportFileType != MDSystemFile)`;

const queryScopes = {
  default: {
    query: (excludeFolders: boolean) => `${queryScopesSharedQueryPart(excludeFolders)}`,
    directories: [`${homedir()}`],
    filters: true,
  },
  applications: {
    query: () => `kMDItemKind = Application && kMDItemLastUsedDate = "*"`,
    directories: [`${homedir()}/Applications`, "/Applications", "/System/Applications"],
  },
  documents: {
    query: (excludeFolders: boolean) => `${queryScopesSharedQueryPart(excludeFolders)}`,
    directories: [`${homedir()}/Documents`],
    filters: true,
  },
  downloads: {
    query: (excludeFolders: boolean) => `${queryScopesSharedQueryPart(excludeFolders)}`,
    directories: [`${homedir()}/Downloads`],
    filters: true,
  },
  folders: {
    query: () =>
      '(kMDItemContentTypeTree = public.folder && kMDItemLastUsedDate = "*" && kMDItemSupportFileType != MDSystemFile)',
    directories: [`${homedir()}`],
  },
} as ScopeDictionary;

const getRecents = async (scope: string | undefined, callback: (result: SpotlightResult) => void): Promise<boolean> => {
  return await new Promise((resolve) => {
    let queryParts: Scope = queryScopes["default"];
    const { limit, excludeFolders } = getPreferenceValues<RecentsPreferences>();
    const shouldExcludeFolders = excludeFolders && !["folders", "applications"].includes(scope || "default");

    if (scope) {
      queryParts = queryScopes[scope];
    }

    const query = mdfind({
      query: queryParts.query(shouldExcludeFolders),
      directories: queryParts.directories,
      attributes: ["kMDItemDisplayName", "kMDItemKind", "kMDItemLastUsedDate"],
      limit: parseInt(limit, 10) || 1000,
    });

    query.output.on("data", (data: SpotlightResult) => {
      callback(data);
    });

    query.output.on("end", function () {
      resolve(true);
    });
  });
};

export default function Command(props: { scope?: string | undefined }) {
  const [loading, setLoading] = useState(true);

  const [recents, setRecents] = useState<SpotlightResult[]>([]);
  const [kinds, setKinds] = useState<string[]>([]);

  const [filter, setFilter] = useState<string>("");
  const [filtered, setFiltered] = useState<SpotlightResult[]>([]);

  const [hasFilters, setHasFilters] = useState<boolean | undefined>(true);

  useEffect(() => {
    (async () => {
      await getRecents(props.scope, (result) => {
        setRecents((recents) => [...recents, result]);
      });

      if (props.scope) {
        setHasFilters(queryScopes[props.scope].filters);
      }

      setLoading(false);
    })();
  }, []);

  useEffect(() => {
    if (loading) {
      return;
    }

    setFiltered(
      recents.sort(
        (a, b) =>
          moment(b.kMDItemLastUsedDate, "YYYY-MM-DD HH:mm:ss +0000").unix() -
          moment(a.kMDItemLastUsedDate, "YYYY-MM-DD HH:mm:ss +0000").unix()
      )
    );

    setKinds(
      recents
        .map((recent) => recent.kMDItemKind)
        .reduce((kinds: string[], kind: string) => {
          if (!kinds.includes(kind)) {
            kinds.push(kind);
          }

          return kinds;
        }, [])
        .sort((a, b) => a?.localeCompare(b))
    );
  }, [loading]);

  useEffect(() => {
    if (loading) {
      return;
    }

    setFiltered(recents.filter((recent) => (filter === "" ? true : recent.kMDItemKind === filter)));
  }, [filter]);

  return (
    <List
      isLoading={loading}
      searchBarAccessory={
        hasFilters && kinds.length ? (
          <List.Dropdown tooltip="Kind" onChange={setFilter} value={filter}>
            <List.Dropdown.Item title={`All (${recents.length})`} value={""} />
            {kinds.map((kind, kindIndex) => (
              <List.Dropdown.Item
                key={kindIndex}
                title={`${kind} (${recents.filter((recent) => recent.kMDItemKind === kind).length})`}
                value={kind}
              />
            ))}
          </List.Dropdown>
        ) : null
      }
    >
      {filtered.map((recent, recentIndex) => (
        <List.Item
          key={recentIndex}
          icon={{ fileIcon: recent.kMDItemPath }}
          title={recent.kMDItemDisplayName}
          quickLook={{ path: recent.kMDItemPath, name: recent.kMDItemDisplayName }}
          actions={
            <ActionPanel>
              <Action.Open
                title={`Open ${recent.kMDItemKind}`}
                icon={{ fileIcon: recent.kMDItemPath }}
                target={recent.kMDItemPath}
                onOpen={() => popToRoot({ clearSearchBar: true })}
              />
              <Action.ShowInFinder
                icon={Icon.Finder}
                title="Show In Finder"
                path={recent.kMDItemPath}
                onShow={() => popToRoot({ clearSearchBar: true })}
              />
              <Action.ToggleQuickLook title="Quick Look" shortcut={{ modifiers: ["cmd"], key: "y" }} />
              <Action.OpenWith
                title="Open With..."
                shortcut={{ modifiers: ["cmd"], key: "o" }}
                path={recent.kMDItemPath}
                onOpen={() => popToRoot({ clearSearchBar: true })}
              />
              <Action
                title="Show Info in Finder"
                icon={Icon.Finder}
                shortcut={{ modifiers: ["cmd"], key: "i" }}
                onAction={() => showInfoInFinder(recent)}
              />
              <ActionPanel.Section>
                <Action.CopyToClipboard
                  title={`Copy ${recent.kMDItemKind}`}
                  shortcut={{ modifiers: ["cmd"], key: "." }}
                  content={``}
                  onCopy={() => copyRecentToClipboard(recent)}
                />
                <Action.CopyToClipboard
                  title="Copy Name"
                  shortcut={{ modifiers: ["cmd", "shift"], key: "." }}
                  content={basename(recent.kMDItemPath)}
                />
                <Action.CopyToClipboard
                  icon={Icon.Clipboard}
                  title="Copy Path"
                  shortcut={{ modifiers: ["cmd", "shift"], key: "," }}
                  content={recent.kMDItemPath}
                />
              </ActionPanel.Section>
              <ActionPanel.Section>
                <Action.CreateQuicklink
                  title="Create Quicklink"
                  icon={Icon.Link}
                  shortcut={{ modifiers: ["cmd", "shift"], key: "l" }}
                  quicklink={{ link: recent.kMDItemPath, name: basename(recent.kMDItemPath) }}
                />
              </ActionPanel.Section>
              <ActionPanel.Section>
                <Action
                  title="Move to Trash"
                  style={Action.Style.Destructive}
                  icon={{ source: Icon.Trash, tintColor: Color.Red }}
                  shortcut={{ modifiers: ["ctrl"], key: "x" }}
                  onAction={() => maybeMoveResultToTrash(recent)}
                />
              </ActionPanel.Section>
            </ActionPanel>
          }
          accessories={[
            {
              text: `Last used: ${
                moment(recent.kMDItemLastUsedDate, "YYYY-MM-DD HH:mm:ss +0000").isDST()
                  ? moment(recent.kMDItemLastUsedDate, "YYYY-MM-DD HH:mm:ss +0000")
                      .add("1", "hour")
                      .format("DD MMMM YYYY @ HH:mm:ss")
                  : moment(recent.kMDItemLastUsedDate, "YYYY-MM-DD HH:mm:ss +0000").format("DD MMMM YYYY @ HH:mm:ss")
              }`,
            },
          ]}
        />
      ))}
    </List>
  );
}
