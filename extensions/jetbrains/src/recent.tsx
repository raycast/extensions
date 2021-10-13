import React, { useEffect, useState } from "react";
import {
  ActionPanel,
  CopyToClipboardAction,
  List,
  OpenWithAction,
  popToRoot,
  render,
  showHUD,
  ShowInFinderAction,
  showToast,
  ToastStyle
} from "@raycast/api";
import { existsSync, readFileSync } from "fs";
import { homedir } from "os";
import { basename, dirname, resolve } from "path";
import { parseString } from "xml2js";
import { exec } from "child_process";
import { file, getFiles, getOtherTools, getRightTool, listAnd, preferredApp } from "./util";

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
}

const ICON_GLOB = "Applications/JetBrains Toolbox/*/Contents/Resources/icon.icns";
const BIN_GLOB = ".config/jetbrains/bin/*";
const RECENT_GLOB = "Library/Application Support/JetBrains/*/options/recentProject*.xml";

function addRecent(app: file, current: Array<recentEntry>): Array<recentEntry> {
  let entries = Array<recentEntry>();
  try {
    const xmlFile = readFileSync(app.path);
    parseString(xmlFile, { attrkey: "_attr" }, (err, result) => {
      if (err) {
        return;
      }
      const recentEntries: Array<recentEntry> = (result.application.component[0].option[0].map[0].entry ?? []).map((recentEntry: xmlJson): recentEntry => {
        const projectOpenTimestamp = (recentEntry.value[0].RecentProjectMetaInfo[0].option ?? []).find((recentOption: xmlJson) => recentOption._attr.name === "projectOpenTimestamp");
        const path = recentEntry._attr.key.replace("$USER_HOME$", homedir());
        return {
          title: basename(path),
          dirname: dirname(path)
            .replace(homedir(), "~")
            .replace("$APPLICATION_HOME_DIR$", "~appHomeDir~")
            .replace("/Volumes", ""),
          path: path,
          opened: Number(projectOpenTimestamp?._attr.value ?? 0),
          parts: path.substr(1).split("/").reverse().join(" ← "),
          app: app.title,
          icon: app.icon
        };
      });
      const paths = current.map(cur => cur.path);
      entries = current.concat(recentEntries.filter(({ path }) => existsSync(path) ?? false).filter(({ path }) => !paths.includes(path)));
    });
  } catch (e) {
    console.log(e);
  }
  return entries;
}

function OpenInJetBrainsAppAction({ tool, recent }: { tool: file, recent: recentEntry }) {
  function handleAction() {
    exec(`${tool.path.replace(" ", "\\ ")} "${recent.path}"`, (err, stdOut, stdErr) => {
      err
        ? showToast(ToastStyle.Failure, "Failed", err.message).then(() => console.log({ err, stdOut, stdErr }))
        : showHUD(`Opening ${recent.title}`).then(() => popToRoot({ clearSearchBar: true }));
    });
  }

  return <ActionPanel.Item
    title={`Open with ${tool.title}`}
    icon={tool.icon}
    onAction={handleAction}
  />;
}

function RecentProject({ app, recent, tools }: { app: string, recent: recentEntry, tools: Array<file> }) {
  const rightTool = getRightTool(tools, recent.app);
  const otherTools = getOtherTools(tools, recent.app, rightTool);

  return <List.Item
    accessoryTitle={app}
    title={recent.title}
    keywords={recent.path.split("/").concat([recent.path]).concat([app])}
    icon={recent.icon}
    subtitle={recent.dirname}
    actions={<ActionPanel title={recent.title}>
      <ActionPanel.Section>
        <OpenInJetBrainsAppAction tool={rightTool} recent={recent} />
        <ShowInFinderAction path={recent.path} />
        {recent.path.search(/\$/) ? <OpenWithAction path={recent.path} /> : null}
        <CopyToClipboardAction title="Copy Path" content={recent.path}
                               shortcut={{ modifiers: ["cmd", "shift"], key: "." }} />
      </ActionPanel.Section>
      <ActionPanel.Section>
        {otherTools.map(tool => <OpenInJetBrainsAppAction key={tool.path} tool={tool} recent={recent} />)}
      </ActionPanel.Section>
    </ActionPanel>
    }
  />;
}

function Command() {
  const [icons, setIcons] = useState<file[]>();
  useEffect(() => {
    getFiles(resolve(homedir(), ICON_GLOB))
      .then(files => setIcons(files.map(icon => ({
          ...icon,
          title: icon.path.split("/").find((path => path.match(/.+\.app/))) || icon.title,
          icon: icon.path
        })
      )));
  }, []);

  const [apps, setApps] = useState<file[]>();
  useEffect(() => {
    if (icons === undefined) return;
    getFiles(resolve(homedir(), RECENT_GLOB)).then(files => setApps(files
      .map(file => {
        const [, appName] = file.path.match(/([^/0-9.]+)([^/]+)\/options\/recentProject.+.xml/) ?? [];
        const icon = icons.find((icon) => icon.path.match(new RegExp(appName.replace("CE", ""), "i")));
        return {
          ...file,
          title: appName || file.title,
          icon: icon ? icon.path : "jb.png"
        };
      })
      .sort((a, b) => b.lastModifiedAt.getTime() - a.lastModifiedAt.getTime())
      .filter(file => !file.path.match(/CodeWithMe/))));
  }, [icons]);

  const [tools, setTools] = useState<file[]>();
  useEffect(() => {
    if (icons === undefined) return;
    if (apps === undefined) return;

    getFiles(resolve(homedir(), BIN_GLOB))
      .then(files => setTools(files.map(file => {
          const icon = icons.find((icon) => icon.path.match(new RegExp(file.title, "i")));
          const app = apps.find((app) => app.title.match(new RegExp(file.title, "i")));
          // console.log([file.title, app?.title]);
          return {
            ...file,
            title: app?.title || file.title,
            icon: icon ? icon.path : "jb.png",
          };
        })
      ));
  }, [icons, apps]);


  const recent = new Map<string, Array<recentEntry>>();
  for (const app of apps ?? []) {
    recent.set(app.title, addRecent(app, recent.get(app.title) ?? []).sort((a, b) => b.opened - a.opened));
  }
  const keys = Array.from(recent.keys()).sort((a, b) => a === preferredApp ? -1 : b === preferredApp ? 1 : 0);
  return (
    <List
      searchBarPlaceholder={`Search recent ${listAnd(recent.keys())} projects…`}
      isLoading={recent.size === 0}
    >
      {tools && keys.map(key =>
        <List.Section key={key} title={key}>
          {(recent.get(key) ?? []).map((recent: recentEntry) =>
            <RecentProject
              tools={tools}
              key={recent.path}
              app={key}
              recent={recent} />)}
        </List.Section>
      )}
    </List>);
}

render(<Command />);