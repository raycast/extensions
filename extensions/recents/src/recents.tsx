import { Action, ActionPanel, Icon, List } from "@raycast/api";
import { useEffect, useState } from "react";

import mdfind from "mdfind";
import moment from "moment";
import { homedir } from "os";

import { SpotlightResult } from "./types";

const getRecents = async (callback: (result: SpotlightResult) => void): Promise<boolean> => {
  return await new Promise((resolve) => {
    const query = mdfind({
      query: `kMDItemLastUsedDate = "*"`,
      directories: [`${homedir()}`],
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

export default function Command() {
  const [loading, setLoading] = useState(true);

  const [recents, setRecents] = useState<SpotlightResult[]>([]);
  const [kinds, setKinds] = useState<string[]>([]);

  const [filter, setFilter] = useState<string>("");
  const [filtered, setFiltered] = useState<SpotlightResult[]>([]);

  useEffect(() => {
    (async () => {
      await getRecents((result) => {
        setRecents((recents) => [...recents, result]);
      });

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
        kinds.length ? (
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
          subtitle={`Last Used: ${moment(recent.kMDItemLastUsedDate, "YYYY-MM-DD hh:mm:ss +0000").format(
            "DD/MM/YYYY"
          )}`}
          actions={
            <ActionPanel>
              <Action.ShowInFinder icon={Icon.Finder} title="Show In Finder" path={recent.kMDItemPath} />
              <Action.CopyToClipboard
                icon={Icon.Clipboard}
                title="Copy Path To Clipboard"
                content={recent.kMDItemPath}
              />
            </ActionPanel>
          }
          accessories={[
            {
              text: recent.kMDItemKind,
            },
          ]}
        />
      ))}
    </List>
  );
}
