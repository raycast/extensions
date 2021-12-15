import React, {useEffect, useState} from "react";
import {
  ActionPanel,
  CopyToClipboardAction,
  Detail,
  getApplications,
  List,
  OpenInBrowserAction,
  OpenWithAction,
  popToRoot,
  showHUD,
  ShowInFinderAction,
  showToast,
  ToastStyle,
} from "@raycast/api";
import {readFile} from "fs/promises";
import {homedir} from "os";
import {dirname, resolve} from "path";
import {exec} from "child_process";
import which from "which";
import {
  AppHistory,
  bin,
  createUniqueArray,
  getFiles,
  getRecentEntries, historicProjects,
  JetBrainsIcon,
  preferredApp,
  recentEntry, useUrl
} from "./util";
import History from "./.history.json";

const ICON_GLOB = "Applications/JetBrains Toolbox/*/Contents/Resources/icon.icns";
const HISTORY_GLOB = "Library/Application Support/JetBrains/Toolbox/apps/**/.history.json";

const getRecent = async (path: string | string[], icon: string) => {
  return getFiles(path).then((apps) => {
    return apps
      .map((file) => ({
          ...file,
          title: file.title,
          icon: icon,
        }))
      .sort((a, b) => b.lastModifiedAt.getTime() - a.lastModifiedAt.getTime());
  });
}

const globFromHistory = (history: History) => {
  if (history.item.intellij_platform === undefined) {
    return []
  }
  const root = dirname(history.item.intellij_platform.default_config_directories['idea.config.path'].replace('$HOME', homedir()));
  return history.item.intellij_platform.config.map(config => `${root}/${config.directory}/options/${config.recent_projects_filename}`)
}

const getHistory = async () => {
  const icons = await getIcons();
  return getFiles(resolve(homedir(), HISTORY_GLOB)).then((histories) => {
    return Promise.all(histories.map((history) => {
      return readFile(history.path)
        .then(contents => JSON.parse(String(contents)))
        .then(json => json.history.pop())
        .then(async (history: History) => {
          const icon = icons.find(icon => icon.title.startsWith(history.item.name))?.path ?? JetBrainsIcon
          const tool = history.item.intellij_platform?.shell_script_name ?? false;
          const activation = history.item.activation?.hosts[0] ?? false
          return {
            title: history.item.name,
            url: useUrl && activation ? `jetbrains://${activation}/navigate/reference?project=` : false,
            tool: tool ? await which(tool, {path: bin}).catch(() => false) : false,
            icon,
            xmlFiles: await getRecent(globFromHistory(history), icon)
          } as AppHistory
        })
    }))
  })
};

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

const loadAppEntries = async (apps: AppHistory[]) => {
  return await Promise.all(apps
    .map(async app => {
      const xmlFiles = app.xmlFiles ?? []
      for (const res of historicProjects ? xmlFiles : xmlFiles.slice(0,1)) {
        const entries = await getRecentEntries(res, app);
        // sort before unique so we get the newest versions
        app.entries =
          createUniqueArray<recentEntry>("path", [...(app.entries ?? []), ...entries]).sort(
            (a, b) => b.opened - a.opened
          )
      }
      return app
    }))
};

function OpenInJetBrainsAppAction({tool, recent}: { tool: AppHistory; recent: recentEntry | null }) {
  function handleAction() {
    const cmd = tool.tool
      ? `${tool.tool} "${recent?.path ?? ''}"`
      : `open ${tool.url}${recent?.title ?? ''}`
    showHUD(`Opening ${recent ? recent.title : tool.title}`)
      .then(() => exec(cmd, {env: {}}))
      .then(() => popToRoot())
      .catch((error) => showToast(ToastStyle.Failure, "Failed", error.message)
        .then(() => console.error({error}))
      )
  }

  return (
    <ActionPanel.Item title={`Open ${recent ? "with " : ""}${tool.title}`} icon={tool.icon} onAction={handleAction}/>
  );
}

function RecentProject({app, recent, tools}: { app: AppHistory; recent: recentEntry, tools: AppHistory[] }) {
  const otherTools = tools.filter((tool) => tool.title !== app.title);

  return (
    <List.Item
      accessoryTitle={app.title}
      title={recent.title}
      keywords={recent.path.split("/").concat([recent.path]).concat([app.title])}
      icon={recent.icon}
      subtitle={recent.parts}
      actions={<ActionPanel>
        <ActionPanel.Section>
          <OpenInJetBrainsAppAction tool={app} recent={recent}/>
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
            <OpenInJetBrainsAppAction key={`${tool.title}-${recent.path}`} tool={tool} recent={recent}/>
          ))}
          <OpenJetBrainsToolBox/>
        </ActionPanel.Section>
      </ActionPanel>}
    />
  );
}

function OpenJetBrainsToolBox() {
  return <ActionPanel.Item icon={JetBrainsIcon} title="Launch JetBrains Toolbox" onAction={() => {
    getApplications().then(apps => {
      const jb = apps.find(app => app.name.match('JetBrains Toolbox'))
      if (jb) {
        exec(`open -a "${jb.name}"`, (err) => err && showToast(ToastStyle.Failure, err?.message))
      } else {
        showToast(ToastStyle.Failure, 'Unable to find JetBrains Toolbox App').catch((err) => console.error(err))
      }
    })
  }}/>;
}

function sortApps(a: AppHistory, b: AppHistory) {
  return a.title.toLowerCase().startsWith(preferredApp.toLowerCase()) ? -1 : b.title.toLowerCase().startsWith(preferredApp.toLowerCase()) ? 1 : 0;
}

interface state {
  loading: boolean
  appHistory: AppHistory[]
}

export default function ProjectList() {
  const [{loading, appHistory}, setAppHistory] = useState<state>({loading: true, appHistory: []});

  useEffect(() => {
    getHistory()
      .then(apps => loadAppEntries(apps)
          .then(withEntries => withEntries.sort(sortApps))
          .then(sorted => {
            setAppHistory({
              loading: false,
              appHistory: sorted,
            })
          })
      )
  }, []);

  if (loading) {
    return <Detail isLoading/>;
  } else if (appHistory.length === 0) {
    const tbUrl = 'https://jb.gg/toolbox-app';
    const message = [
      '# Unable to find any JetBrains Toolbox apps',
      `Please check that you have installed [JetBrains Toolbox](${tbUrl}) and added at least one IDE.`
    ]
    return <Detail markdown={message.join('\n\n')} actions={<ActionPanel>
      <OpenInBrowserAction title='Open Toolbox Website' url={tbUrl} icon={JetBrainsIcon}/>
      <OpenInBrowserAction title='Open Toolbox FAQ' url={`${tbUrl}-faq`}/>
    </ActionPanel>}/>
  } else if (!appHistory.reduce((exists, appHistory) => (exists || appHistory.tool !== false || appHistory.url !== false), false)) {
    const message = [
      '# There was a problem finding the JetBrains shell scripts',
      'We were unable to find shell scripts, ensure you have the **Generate Shell scripts** option checked in *JetBrains Toolbox* under *Settings*.',
      `If you have set a custom path for your shell scripts, that can set that in the settings for this extension, this is currently set to \`${bin}\`.`,
      useUrl
        ? 'Additionally, we were unable to find a protocol url link to fallback on, please ensure you are using the latest version of JetBrains Toolbox and any apps you are using.'
        : 'You can also enable the extension preference to fallback to protocol url, though that is a less reliable method of opening projects.',
    ];
    return <Detail markdown={message.join('\n\n')} actions={<ActionPanel>
      <OpenJetBrainsToolBox/>
    </ActionPanel>}/>
  }

  const defaultActions = <>
    {appHistory.map((tool) => (
      <OpenInJetBrainsAppAction key={tool.title} tool={tool} recent={null}/>
    ))}
    <OpenJetBrainsToolBox/>
  </>

  return (
    <List
      searchBarPlaceholder={`Search recent projects…`}
      actions={<ActionPanel children={defaultActions}/>}
    >
      {appHistory.map((app) => (
        <List.Section title={app.title} key={app.title}>
          {(app.entries ?? []).map((recent: recentEntry) =>
              recent?.path ? (
                <RecentProject key={`${app.title}-${recent.path}`} app={app} recent={recent} tools={appHistory}/>
              ) : null
            )}
        </List.Section>
      ))}
    </List>
  );
}
