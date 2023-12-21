import {
  Action,
  ActionPanel,
  closeMainWindow,
  getPreferenceValues,
  Icon,
  List,
  PopToRootType,
  showToast,
  Toast,
} from "@raycast/api";
import { useEffect, useState } from "react";
import { showFailureToast, useExec } from "@raycast/utils";
import { exec } from "node:child_process";
import { setTimeout } from "timers/promises";
import * as fs from "fs";
import * as xml from "xml-js";
import { homedir } from "node:os";
import Style = Toast.Style;

const SUPPORT_IDE: { [key: string]: { name: string; shell: string } } = {
  PS: { name: "PhpStorm", shell: "phpstorm" },
  WS: { name: "WebStorm", shell: "webstorm" },
  IU: { name: "Idea", shell: "idea" },
};

type RecentProjects = {
  application: {
    component: {
      _attributes: {
        name: string;
      };
      option: {
        _attributes: { name: string };
        map: {
          entry: {
            _attributes: { key: string };
            value: { RecentProjectMetaInfo: { option: { _attributes: { name: string; value: string } }[] } };
          }[];
        };
      }[];
    };
  };
};

export default function Command() {
  const [search, setSearch] = useState("");

  const { isLoading, data } = useExec("mdfind", ["-name", search ? search : "sdfdsfdsf"]);

  const [history, setHistory] = useState<{ path: string; timestamp: number; ide: string }[]>([]);

  useEffect(() => {
    const tmpHistory: { [key: string]: { path: string; timestamp: number; ide: string } } = {};
    const files = fs.readdirSync(homedir() + "/Library/Application Support/JetBrains", { withFileTypes: true });
    files.forEach((file) => {
      if (!file.isDirectory()) {
        return;
      }
      const xmlPath = file.path + "/" + file.name + "/options/recentProjects.xml";
      try {
        fs.accessSync(xmlPath, fs.constants.F_OK);
        const content: RecentProjects = JSON.parse(
          xml.xml2json(fs.readFileSync(xmlPath).toString(), { compact: true }),
        );
        if (content?.application?.component?._attributes?.name != "RecentProjectsManager") {
          return;
        }
        content?.application?.component?.option?.forEach((option) => {
          if (option._attributes?.name != "additionalInfo") {
            return;
          }

          option?.map?.entry?.forEach?.((entry) => {
            const path = entry?._attributes?.key?.replace("$USER_HOME$", homedir());
            let timestamp = 0,
              ide = "";
            entry?.value?.RecentProjectMetaInfo?.option?.forEach((o) => {
              if (o._attributes?.name == "projectOpenTimestamp") {
                timestamp = Number(o._attributes?.value);
              }
              if (o._attributes?.name == "productionCode") {
                ide = o._attributes?.value;
              }
            });

            let existsTimestamp = 0;
            if (tmpHistory[path]) {
              existsTimestamp = tmpHistory[path].timestamp;
            }
            if (timestamp >= existsTimestamp) {
              tmpHistory[path] = {
                path,
                timestamp,
                ide,
              };
            }
          });
        });
      } catch (err) {
        return;
      }
    });
    setHistory(Object.keys(tmpHistory).map((i) => tmpHistory[i]));
  }, []);

  const open = (shell: string, path: string) => {
    const preferences = getPreferenceValues();

    exec(`${preferences.shell_path}/${shell} ${path}`, (error) => {
      if (error) {
        showFailureToast(error);
      } else {
        showToast({ title: "打开成功", style: Style.Success }).then(() => {
          setTimeout(300);
          closeMainWindow({ clearRootSearch: true, popToRootType: PopToRootType.Immediate });
        });
      }
    });
  };

  const renderAction = (ide: string | undefined, path: string) => {
    let supportIde = Object.keys(SUPPORT_IDE);
    if (ide) {
      supportIde = [ide].concat(Object.keys(SUPPORT_IDE).filter((i) => i !== ide));
    }

    return (
      <ActionPanel title={"选择工具"}>
        {supportIde.map((i) => (
          <Action
            key={i}
            title={`Open With ${SUPPORT_IDE[i].name}`}
            icon={getIcon(i) ? getIcon(i) : "extension_icon.png"}
            onAction={() => open(SUPPORT_IDE[i].shell, path)}
          />
        ))}
        <Action.ShowInFinder key={"finder"} path={path} title={"Show In Finder"} icon={"finder.png"} />
      </ActionPanel>
    );
  };

  const getIcon = (ide?: string) => {
    switch (ide) {
      case "PS":
        return "phpstorm.png";
      case "WS":
        return "webstorm.png";
      case "IU":
        return "idea.png";
    }
    return "";
  };

  if (search) {
    return (
      <List
        searchBarPlaceholder={"输入文件名进行搜索"}
        onSearchTextChange={setSearch}
        searchText={search}
        isLoading={isLoading}
      >
        {data
          ?.split("\n")
          .filter((i) => {
            if (i) {
              const stats = fs.statSync(i);
              if (stats.isDirectory()) {
                return true;
              }
              return false;
            }
            return false;
          })
          .map((i) => {
            const historyProject = history.find((h) => h.path === i);
            let icon = getIcon(historyProject?.ide);
            if (!icon) {
              icon = Icon.Folder;
            }

            return (
              <List.Item
                key={i}
                title={i.replace(homedir(), "~")}
                icon={icon}
                actions={renderAction(historyProject?.ide, i)}
              />
            );
          })}
      </List>
    );
  }
  return (
    <List
      searchBarPlaceholder={"输入文件名进行搜索"}
      onSearchTextChange={setSearch}
      searchText={search}
      isLoading={isLoading}
    >
      {history
        ?.sort((a, b) => b.timestamp - a.timestamp)
        ?.map((i) => {
          let icon = getIcon(i.ide);
          if (!icon) {
            icon = "extension_icon.png";
          }

          return (
            <List.Item
              key={i.path}
              title={i.path?.replace(homedir(), "~")}
              icon={icon}
              actions={renderAction(i.ide, i.path)}
            />
          );
        })}
    </List>
  );
}
