import { homedir } from "os";

import { Action, ActionPanel, Icon, List } from "@raycast/api";
import { useEffect, useState } from "react";

import mdfind from "mdfind";
import moment from "moment";

import { copyRecentToClipboard } from "./utils";

import { Scope, ScopeDictionary, SpotlightResult } from "./types";

const queryScopes = {
  default: {
    query: `kMDItemLastUsedDate = "*"`,
    directories: [`${homedir()}`],
    filters: true,
  },
  applications: {
    query: 'kMDItemKind == Application && kMDItemLastUsedDate = "*"',
    directories: [`${homedir()}/Applications`, "/Applications", "/System/Applications"],
  },
  documents: {
    query: 'kMDItemLastUsedDate = "*"',
    directories: [`${homedir()}/Documents`],
    filters: true,
  },
  downloads: {
    query: 'kMDItemLastUsedDate = "*"',
    directories: [`${homedir()}/Downloads`],
    filters: true,
  },
  folders: {
    query: 'kMDItemKind == Folder && kMDItemLastUsedDate = "*"',
    directories: [`${homedir()}`],
  },
} as ScopeDictionary;

const getRecents = async (scope: string | undefined, callback: (result: SpotlightResult) => void): Promise<boolean> => {
  return await new Promise((resolve) => {
    let queryParts: Scope = queryScopes["default"];

    if (scope) {
      queryParts = queryScopes[scope];
    }

    const query = mdfind({
      query: queryParts.query,
      directories: queryParts.directories,
      attributes: ["kMDItemDisplayName", "kMDItemKind", "kMDItemLastUsedDate"],
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
          moment(b.kMDItemLastUsedDate, "YYYY-MM-DD hh:mm:ss +0000").unix() -
          moment(a.kMDItemLastUsedDate, "YYYY-MM-DD hh:mm:ss +0000").unix()
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
          <List.Dropdown tooltip="Type" onChange={setFilter} value={filter}>
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
          actions={
            <ActionPanel>
              <Action.Open
                title={`Open ${recent.kMDItemKind}`}
                icon={{ fileIcon: recent.kMDItemPath }}
                target={recent.kMDItemPath}
              />
              <Action.ShowInFinder icon={Icon.Finder} title="Show In Finder" path={recent.kMDItemPath} />
              <Action.CopyToClipboard
                icon={Icon.Clipboard}
                title="Copy Path To Clipboard"
                shortcut={{ modifiers: ["cmd", "shift"], key: "enter" }}
                content={recent.kMDItemPath}
              />
              <Action.CopyToClipboard
                title={`Copy ${recent.kMDItemKind}`}
                shortcut={{ modifiers: ["cmd", "shift"], key: "." }}
                content={``}
                onCopy={() => copyRecentToClipboard(recent)}
              />
            </ActionPanel>
          }
          accessories={[
            {
              text: `Last Used: ${moment(recent.kMDItemLastUsedDate, "YYYY-MM-DD hh:mm:ss +0000").format(
                "DD/MM/YYYY"
              )}`,
            },
          ]}
        />
      ))}
    </List>
  );
}
