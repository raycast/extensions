import React, { useEffect, useState } from "react";
import { ActionPanel, Application, Detail, getApplications, List } from "@raycast/api";
import { readFile } from "fs/promises";
import { homedir } from "os";
import { dirname, resolve } from "path";
import which from "which";
import {
  AppHistory,
  bin,
  createUniqueArray,
  getFiles,
  getRecentEntries,
  historicProjects,
  JetBrainsIcon,
  recentEntry,
  sortApps,
  toolsInstall,
  useUrl,
} from "./util";
import History from "./.history.json";
import { HelpTextDetail, tbUrl } from "./components/HelpTextDetail";
import { OpenJetBrainsToolbox } from "./components/OpenJetBrainsToolbox";
import { RecentProject } from "./components/RecentProject";
import { OpenInJetBrainsAppAction } from "./components/OpenInJetBrainsAppAction";

const ICON_GLOB = resolve(homedir(), "Applications/JetBrains Toolbox/*/Contents/Resources/icon.icns");
const HISTORY_GLOB = resolve(toolsInstall, "apps/**/.history.json");

const getRecent = async (path: string | string[], icon: string) => {
  return (await getFiles(path))
    .map((file) => ({
      ...file,
      title: file.title,
      icon: icon,
    }))
    .sort((a, b) => b.lastModifiedAt.getTime() - a.lastModifiedAt.getTime());
};

const getJetBrainsToolboxApp = async (): Promise<Application | undefined> => {
  return (await getApplications()).find((app) => app.name.match("JetBrains Toolbox"));
};

const globFromHistory = (history: History) => {
  if (history.item.intellij_platform === undefined) {
    return [];
  }
  const root = dirname(
    history.item.intellij_platform.default_config_directories["idea.config.path"].replace("$HOME", homedir())
  );
  return history.item.intellij_platform.config.map(
    (config) => `${root}/${config.directory}/options/${config.recent_projects_filename}`
  );
};

const getHistory = async () => {
  const icons = await getIcons();
  return await Promise.all(
    (
      await getFiles(HISTORY_GLOB)
    ).map(async (file) => {
      const history: History = JSON.parse(String(await readFile(file.path))).history.pop() as History;
      const icon = icons.find((icon) => icon.title.startsWith(history.item.name))?.path ?? JetBrainsIcon;
      const tool = history.item.intellij_platform?.shell_script_name ?? false;
      const activation = history.item.activation?.hosts[0] ?? false;
      return {
        title: history.item.name,
        url: useUrl && activation ? `jetbrains://${activation}/navigate/reference?project=` : false,
        tool: tool ? await which(tool, { path: bin }).catch(() => false) : false,
        icon,
        xmlFiles: await getRecent(globFromHistory(history), icon),
      } as AppHistory;
    })
  );
};

const getIcons = async () => {
  return (await getFiles(ICON_GLOB)).map((icon) => {
    return {
      ...icon,
      title: icon.path.split("/").find((path) => path.match(/.+\.app/)) || icon.title,
      icon: icon.path,
    };
  });
};

const loadAppEntries = async (apps: AppHistory[]) => {
  return await Promise.all(
    apps.map(async (app) => {
      const xmlFiles = app.xmlFiles ?? [];
      for (const res of historicProjects ? xmlFiles : xmlFiles.slice(0, 1)) {
        const entries = await getRecentEntries(res, app);
        // sort before unique so we get the newest versions
        app.entries = createUniqueArray<recentEntry>("path", [...(app.entries ?? []), ...entries]).sort(
          (a, b) => b.opened - a.opened
        );
      }
      return app;
    })
  );
};

interface state {
  loading: boolean;
  toolboxApp: Application | undefined;
  appHistory: AppHistory[];
}

export default function ProjectList(): JSX.Element {
  const [{ loading, toolboxApp, appHistory }, setState] = useState<state>({
    loading: true,
    toolboxApp: undefined,
    appHistory: [],
  });

  useEffect(() => {
    const setHistory = async () => {
      setState({
        loading: false,
        toolboxApp: await getJetBrainsToolboxApp(),
        appHistory: (await loadAppEntries(await getHistory())).sort(sortApps),
      });
    };
    setHistory().catch((err) => console.error(err));
  }, []);

  if (loading) {
    return <Detail isLoading />;
  } else if (toolboxApp === undefined) {
    const message = [
      "# Unable to find JetBrains Toolbox",
      `Please check that you have installed [JetBrains Toolbox](${tbUrl})`,
    ];
    return <HelpTextDetail message={message} toolbox={undefined} />;
  } else if (appHistory.length === 0) {
    const message = [
      "# Unable to find any JetBrains Toolbox apps",
      `Please check that you have installed [JetBrains Toolbox](${tbUrl}) and added at least one IDE.`,
      `If you have specified a custom "Tools install location" you'll need to set that in the preferences for this extension, this is currently set to \`${toolsInstall}\`.`,
    ];
    return <HelpTextDetail message={message} toolbox={toolboxApp} />;
  } else if (
    !appHistory.reduce((exists, appHistory) => exists || appHistory.tool !== false || appHistory.url !== false, false)
  ) {
    const message = [
      "# There was a problem finding the JetBrains shell scripts",
      "We were unable to find shell scripts, ensure you have the **Generate Shell scripts** option checked in *JetBrains Toolbox* under *Settings*.",
      `If you have set a custom path for your shell scripts, that can set that in the settings for this extension, this is currently set to \`${bin}\`.`,
      useUrl
        ? "Additionally, we were unable to find a protocol url link to fallback on, please ensure you are using the latest version of JetBrains Toolbox and any apps you are using."
        : "You can also enable the extension preference to fallback to protocol url, though that is a less reliable method of opening projects.",
    ];
    return <HelpTextDetail message={message} toolbox={toolboxApp} />;
  }

  const defaultActions = (
    <>
      {appHistory.map((tool) => (
        <OpenInJetBrainsAppAction key={tool.title} tool={tool} recent={null} />
      ))}
      <OpenJetBrainsToolbox app={toolboxApp} />
    </>
  );

  return (
    <List searchBarPlaceholder={`Search recent projects…`} actions={<ActionPanel children={defaultActions} />}>
      {appHistory.map((app) => (
        <List.Section title={app.title} key={app.title}>
          {(app.entries ?? []).map((recent: recentEntry) =>
            recent?.path ? (
              <RecentProject
                key={`${app.title}-${recent.path}`}
                app={app}
                recent={recent}
                tools={appHistory}
                toolbox={toolboxApp}
              />
            ) : null
          )}
        </List.Section>
      ))}
    </List>
  );
}
