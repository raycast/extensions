import React, {useEffect, useState} from "react";
import {
  ActionPanel,
  CopyToClipboardAction,
  Detail,
  List,
  OpenWithAction,
  popToRoot,
  render,
  showHUD,
  ShowInFinderAction,
  showToast,
  ToastStyle,
} from "@raycast/api";
import Fuse from "fuse.js";
import {readFile, stat} from "fs/promises";
import {homedir} from "os";
import {basename, dirname, resolve} from "path";
import {parseStringPromise} from "xml2js";
import {exec} from "child_process";
import {createUniqueArray, file, getFiles, getOtherTools, getRightTool, listAnd, preferredApp} from "./util";

const JetBrainsIcon = "jb.png";

interface xmlJson {
  _attr: {
    [key: string]: string;
  };
  value: Array<xmlJson>;
  RecentProjectMetaInfo: Array<xmlJson>;
  option: Array<xmlJson>;
}

interface recentEntry {
  title: string;
  dirname: string;
  path: string;
  parts: string;
  opened: number;
  app: string;
  icon: string;
  exists?: boolean;
  filter?: number;
}

const ICON_GLOB = "Applications/JetBrains Toolbox/*/Contents/Resources/icon.icns";
const BIN_GLOB = ".config/jetbrains/bin/*";
const RECENT_GLOB = "Library/Application Support/JetBrains/*/options/recentProject*.xml";

const getIcons = async () => {
  return getFiles(resolve(homedir(), ICON_GLOB)).then((icons) =>
    icons.map((icon) => {
      return {
        ...icon,
        title: icon.path.split("/").find((path) => path.match(/.+\.app/)) || icon.title,
        icon: icon.path,
      };
    })
  );
};

const getTools = async (icons: Promise<file[]>, apps: Promise<file[]>) => {
  return getFiles(resolve(homedir(), BIN_GLOB)).then((tools) =>
    Promise.all(
      tools.map(async (file) => {
        const icon = (await icons).find((icon) => icon.path.match(new RegExp(file.title, "i")));
        const app = (await apps).find((app) => {
          return app.title.toLowerCase().startsWith(file.title.toLowerCase());
        });
        return {
          ...file,
          title: app ? app.title : file.title,
          icon: icon ? icon.path : JetBrainsIcon,
        };
      })
    )
  );
};

const getApps = async (icons: Promise<file[]>) => {
  return icons.then((icons) => {
    return getFiles(resolve(homedir(), RECENT_GLOB)).then((apps) => {
      return apps
        .filter((file) => !file.path.match(/CodeWithMe/))
        .map((file) => {
          const [, appName] = file.path.match(/([^/0-9.]+)([^/]+)\/options\/recentProject.+.xml/) ?? [];
          const icon = icons.find((icon) => icon.path.match(new RegExp(appName.replace("CE", ""), "i")));
          return {
            ...file,
            title: appName || file.title,
            icon: icon ? icon.path : JetBrainsIcon,
          };
        })
        .sort((a, b) => b.lastModifiedAt.getTime() - a.lastModifiedAt.getTime());
    });
  });
};

const loadEntries = async (apps: Promise<file[]>) => {
  const map = new Map<string, Array<recentEntry>>();
  for (const app of await apps) {
    const res = await app;
    const entries = await getRecentEntries(res);
    // sort before unique so we get the newest versions
    map.set(
      res.title,
      createUniqueArray<recentEntry>("path", [...(map.get(res.title) ?? []), ...entries]).sort(
        (a, b) => b.opened - a.opened
      )
    );
  }
  return map;
};

async function getRecentEntries(app: file): Promise<Array<recentEntry>> {
  const recents = readFile(app.path).then((xmlFile) =>
    parseStringPromise(xmlFile, {attrkey: "_attr"}).then((result) => {
      const recentEntries: Array<recentEntry> = (result.application.component[0].option[0].map[0].entry ?? []).map(
        (recentEntry: xmlJson): recentEntry => {
          const projectOpenTimestamp = (recentEntry.value[0].RecentProjectMetaInfo[0].option ?? []).find(
            (recentOption: xmlJson) => recentOption._attr.name === "projectOpenTimestamp"
          );
          const path = recentEntry._attr.key.replace("$USER_HOME$", homedir());
          return {
            title: basename(path),
            dirname: dirname(path)
              .replace(homedir(), "~")
              // .replace('$APPLICATION_HOME_DIR$', "~appHomeDir~")
              .replace("/Volumes", ""),
            path: path,
            opened: Number(projectOpenTimestamp?._attr.value ?? 0),
            parts: path.substr(1).split("/").reverse().slice(1).join(" ← "),
            app: app.title,
            icon: app.icon ?? JetBrainsIcon,
          };
        }
      );
      return recentEntries.map(async (recent) => {
        return {
          ...recent,
          exists: await stat(recent.path)
            .then(() => true)
            .catch(() => false),
        } as recentEntry;
      });
    })
  );
  return recents.then(async (entries) => await Promise.all(entries));
}

function OpenInJetBrainsAppAction({tool, recent}: { tool: file; recent: recentEntry | null }) {
  function handleAction() {
    exec(`${tool.path.replace(" ", "\\ ")} "${recent ? recent.path : ""}"`, (err, stdOut, stdErr) => {
      err
        ? showToast(ToastStyle.Failure, "Failed", err.message).then(() => console.log({err, stdOut, stdErr}))
        : showHUD(`Opening ${recent ? recent.title : tool.title}`).then(() => popToRoot({clearSearchBar: true}));
    });
  }

  return (
    <ActionPanel.Item title={`Open ${recent ? "with " : ""}${tool.title}`} icon={tool.icon} onAction={handleAction}/>
  );
}

function RecentProject({app, recent, tools}: { app: string; recent: recentEntry; tools: Array<file> }) {
  const rightTool = getRightTool(tools, recent.app);
  const otherTools = getOtherTools(tools, recent.app, rightTool);

  return (
    <List.Item
      accessoryTitle={app}
      title={recent.title}
      keywords={recent.path.split("/").concat([recent.path]).concat([app])}
      icon={recent.icon}
      subtitle={recent.parts}
      actions={<ActionPanel>
        <ActionPanel.Section>
          <OpenInJetBrainsAppAction tool={rightTool} recent={recent}/>
          <ShowInFinderAction path={recent.path}/>
          {recent.exists ? <OpenWithAction path={recent.path}/> : null}
          <CopyToClipboardAction
            title="Copy Path"
            content={recent.path}
            shortcut={{modifiers: ["cmd", "shift"], key: "."}}
          />
        </ActionPanel.Section>
        <ActionPanel.Section>
          {otherTools.map((tool) => (
            <OpenInJetBrainsAppAction key={`${tool.path}-${recent.path}`} tool={tool} recent={recent}/>
          ))}
        </ActionPanel.Section>
      </ActionPanel>}
    />
  );
}

interface state {
  keys: Array<string>;
  recent: Map<string, Array<recentEntry>> | null;
  tools: Array<file> | null;
}

const fuseRecent = (search: string, recent: Array<recentEntry>, fused: Fuse<recentEntry> | undefined): recentEntry[] => {
  if (search === '') {
    return recent;
  }
  if (fused === undefined) {
    return recent;
  }

  return fused.search(search).map(({item}) => item)
};

function ProjectList() {
  const [{recent, tools, keys}, setRecent] = useState<state>({recent: null, tools: null, keys: []});
  const [search, setSearch] = useState<string>("");
  const [fused, setFused] = useState<Map<string, Fuse<recentEntry>>>(new Map<string, Fuse<recentEntry>>());

  useEffect(() => {
    const icons = getIcons();
    const apps = getApps(icons);
    getTools(icons, apps).then((tools) =>
      loadEntries(apps).then((entries) =>
        setRecent({
          recent: entries,
          tools: tools.sort((a, b) =>
            a.title === preferredApp.toLowerCase() ? -1 : b.title === preferredApp.toLowerCase() ? 1 : 0
          ),
          keys: Array.from(entries.keys())
            .sort((a, b) => (a === preferredApp ? -1 : b === preferredApp ? 1 : 0))
        })
      )
    );
  }, []);

  useEffect(() => {
    const updated = new Map<string, Fuse<recentEntry>>()
    const options = {
      isCaseSensitive: false,
      findAllMatches: true,
      shouldSort: true,
      ignoreLocation: true,
      // Search in `author` and in `tags` array
      keys: ['path', 'title', 'parts', 'app']
    };
    for (const key of keys) {
      const entries = recent?.get(key);
      if (entries === undefined) {
        continue
      }
      updated.set(key, new Fuse<recentEntry>(entries, options));
    }
    setFused(updated)
  }, [recent])

  if (recent === null || tools === null) {
    return <Detail isLoading/>;
  } else if (tools.length === 0) {
    return (
      <Detail
        markdown="No JetBrains applications found. Please check that you have [JetBrains Toolbox](https://jb.gg/toolbox-app-faq) and at least one IDE installed."/>
    );
  } else if (recent.size === 0) {
    return (
      <Detail markdown="No recent projects found">
        <ActionPanel>
          {tools
            .sort((a, b) =>
              a.title === preferredApp.toLowerCase() ? -1 : b.title === preferredApp.toLowerCase() ? 1 : 0
            )
            .map((tool) => (
              <OpenInJetBrainsAppAction key={tool.title} tool={tool} recent={null}/>
            ))}
        </ActionPanel>
      </Detail>
    );
  }

  return (
    <List
      searchBarPlaceholder={`Search recent ${listAnd(recent.keys())} projects…`}
      onSearchTextChange={(term) => setSearch(term.trim())}
    >
      {keys.map((key: string) => (
        <List.Section title={key} key={key}>
          {fuseRecent(search, recent.get(key) ?? [], fused.get(key))
            .map((recent: recentEntry) =>
              recent?.path && tools.length > 0 ? (
                <RecentProject tools={tools} key={`${key}-${recent.path}`} app={key} recent={recent}/>
              ) : null
            )}
        </List.Section>
      ))}
    </List>
  );
}

render(<ProjectList/>);
