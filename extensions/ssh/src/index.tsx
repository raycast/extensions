import {
  ActionPanel,
  Action,
  List,
  open,
  closeMainWindow,
  getPreferenceValues,
  popToRoot,
  Icon,
  openExtensionPreferences,
} from "@raycast/api";
import { useState } from "react";
import * as fs from "fs";
import * as sshConfig from "ssh-config";
import { shellHistory } from "shell-history";


const preferences = getPreferenceValues<Preferences>();
const scanHistory = preferences.history
const scanSSHConfig = preferences.sshConfig
const sftpApp = preferences.sftpApp
const sshApp = preferences.sshApp

export default function Command() {

  let data = [];
  const [searchText, setSearchText] = useState("");

  if (scanSSHConfig && fs.existsSync(`${process.env.HOME}/.ssh/config`)){
      const configs = sshConfig.parse(fs.readFileSync(`${process.env.HOME}/.ssh/config`, { encoding: "utf8" }));
      for (let i = 0; i < configs.length; i++) {
          const item = configs[i];
          if (item.value.toLowerCase().includes(searchText.toLowerCase())) {
              let title = `ssh ${item.value}`
              let user = undefined
              const userConfig =  item.config.filter((i: { param: string; }) => i.param === 'User')
              if (userConfig && userConfig.length >0){
                  user = userConfig[0].value
                  title = `ssh ${user}@${item.value}`
              }
              data.push({
                  title: title,
                  from: "~/.ssh/config",
                  user: user,
              } as SearchResult);
          }
      }
  }

  if (scanHistory){
      const history = shellHistory({ max: 500, format: "string" });
      for (let i = 0; i < history.length; i++) {
          const item = history[i];
          if (item.startsWith("ssh ") &&item.toLowerCase().includes(searchText.toLowerCase())) {
              data.push({ title: item, from: "history" } as SearchResult);
          }
      }
  }


  data = data.reduce((prev: SearchResult[], curr: SearchResult) => {
    const index = prev.findIndex((item) => item.title === curr.title);
    if (index === -1) {
      prev.push(curr);
    }
    return prev;
  }, []);
  return (
    <List
      onSearchTextChange={setSearchText}
      searchBarPlaceholder="Search SSH Command..."
      throttle
    >
      <List.Section title="Results" subtitle={data?.length + ""}>
        {data?.map((searchResult) => (
          <SearchListItem
            key={searchResult.title}
            searchResult={searchResult}
          />
        ))}
      </List.Section>
    </List>
  );
}

function SearchListItem({ searchResult }: { searchResult: SearchResult }) {
  const sshTitle = `Execute ssh in ${sshApp.name}`
  const sftpTitle = `Execute sftp in ${sftpApp.name}`
  return (
    <List.Item
      title={searchResult.title}
      subtitle={searchResult.user}
      accessories={[{text:searchResult.from}]}
      actions={
        <ActionPanel title="SSH/SFTP in raycast/extensions">
          <Action
            title={sshTitle}
            icon={Icon.Terminal}
            onAction={() => {
              closeMainWindow();
              popToRoot();
              open(searchResult.title.replace("ssh ","ssh://"),sshApp.path);
            }}
          />
          <Action
            title={sftpTitle}
            shortcut={{ modifiers: ["cmd"], key: "enter" }}
            icon={Icon.Terminal}
            onAction={() => {
              closeMainWindow();
              popToRoot();
              open(searchResult.title.replace("ssh ","sftp://"),sftpApp.path);
            }}
          />
          <Action.CopyToClipboard
            title="Copy SSH Command"
            content={`${searchResult.title}`}
            shortcut={{ modifiers: ["cmd", "ctrl"], key: "c" }}
          />
          <Action title="Open Extension Preferences" icon={Icon.Gear} onAction={openExtensionPreferences} />
        </ActionPanel>
      }
    />
  );
}

interface SearchResult {
    title: string;
    from: string;
    user: string;
}

interface Preferences {
    history: boolean;
    sshConfig: boolean;
    sftpApp: application;
    sshApp: application;
}

interface application {
    name: string;
    path: string;
    bundleId: string;
}