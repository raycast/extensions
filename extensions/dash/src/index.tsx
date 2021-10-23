import React, { useEffect, useState } from "react";
import { ActionPanel, List, OpenAction, getPreferenceValues, showToast, ToastStyle, useNavigation, Icon } from "@raycast/api";
import { exec } from "child_process";
import parser from "fast-xml-parser";
import { join } from "path";
import fg from "fast-glob";
import { parse } from "plist";
import { readFile } from "fs/promises";
import { homedir } from "os";

interface Preferences {
  dashPath: string;
}

interface Docset {
  id: string;
  name: string;
}

interface Item {
  title: string;
  _uid?: string;
  subtitle: string[];
  icon: string;
  quicklookurl: string;
}

const ItemList: React.FC<{ docset?: Docset }> = ({ docset }) => {
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<Item[]>([]);

  const handleSearch = (text: string) => {
    if (!text) {
      setItems([]);
      setLoading(true);
      return;
    }
    setLoading(true);
    const preferences: Preferences = getPreferenceValues();
    exec(
      join(preferences.dashPath, "/Contents/Resources/dashAlfredWorkflow ") +
        [docset?.id, text].filter(Boolean).join(":"),
      (error, stdout) => {
        setLoading(false);
        if (error) {
          showToast(ToastStyle.Failure, error.message);
          return;
        }
        const result = parser.parse(stdout);
        if (result?.output?.items?.item) {
          const items = result.output.items.item;
          setItems(Array.isArray(items) ? items : [items]);
        }
      }
    );
  };

  return (
    <List
      throttle
      isLoading={loading}
      navigationTitle={`Search ${docset?.name ?? "all docsets"}`}
      onSearchTextChange={handleSearch}
    >
      {items.map((item, i) => (
        <List.Item
          key={[item._uid, item.title, item.quicklookurl].filter(Boolean).join("")}
          icon={item.icon}
          title={item.title}
          subtitle={item.subtitle.concat().pop()}
          actions={
            <ActionPanel>
              <OpenAction title="Open in Dash" target={`dash-workflow-callback://${i}`} />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
};

const DocSetList = () => {
  const [docsets, setDocsets] = useState<Docset[]>([]);
  const { push } = useNavigation();

  const loadDocsets = async () => {
    const plistFiles = await fg(
      join(homedir(), "/Library/Application Support/Dash/DocSets/*/*.docset/Contents/Info.plist")
    );
    const docSets = await Promise.all(
      plistFiles.map(async (file) => {
        const plist: any = parse(await readFile(file, "utf8"));
        return {
          id: plist.CFBundleIdentifier,
          name: plist.CFBundleName,
        };
      })
    );
    setDocsets(docSets);
  };

  useEffect(() => {
    loadDocsets();
  }, []);

  return (
    <List>
      <List.Item
        title="dash"
        subtitle="Search all docsets"
        icon={Icon.Circle}
        actions={
          <ActionPanel>
            <ActionPanel.Item title="Search all docsets" onAction={() => push(<ItemList />)} />
          </ActionPanel>
        }
      />
      {docsets.map((docSet) => (
        <List.Item
          key={docSet.id}
          title={docSet.id}
          icon={Icon.Circle}
          subtitle={`Search ${docSet.name}`}
          actions={
            <ActionPanel>
              <ActionPanel.Item title={`Search ${docSet.name}`} onAction={() => push(<ItemList docset={docSet} />)} />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
};

export default () => <DocSetList />;
