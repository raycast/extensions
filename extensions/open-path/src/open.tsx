import { Application, Clipboard, List, LocalStorage, Toast, getPreferenceValues, open, showToast } from "@raycast/api";
import fs from "fs";
import { useEffect, useState } from "react";
import { AppActionPanel } from "./AppActionPanel";

interface Preferences {
  historyLimit?: number;
  readClipboardPossiblePath: boolean;
  customApp1?: Application;
  customApp2?: Application;
  customApp3?: Application;
  customApp4?: Application;
  customApp5?: Application;
  customApp6?: Application;
  customApp7?: Application;
  customApp8?: Application;
  customApp9?: Application;
  customApp10?: Application;
}

export type ListItemProps = {
  path: string;
  openPath: (path: string, app?: Application) => void;
};

export default function Command() {
  const [inputText, setInputText] = useState("");
  const [history, setHistory] = useState<string[]>([]);
  const [filtering, setFiltering] = useState(true);

  const historyLimit = Number(getPreferenceValues<Preferences>().historyLimit) || 20;

  useEffect(() => {
    Promise.all([
      getPreferenceValues<Preferences>().readClipboardPossiblePath
        ? Clipboard.readText().then((text) => fs.existsSync(text || "") && setInputText(text || ""))
        : Promise.resolve(),
      LocalStorage.getItem<string>("history").then((storedHistoryString) => {
        if (storedHistoryString) {
          const storedHistory = JSON.parse(storedHistoryString);
          setHistory(storedHistory);
        }
      }),
    ]).then(() => setFiltering(false));
  }, []);

  const openPath = async (path: string, app?: Application) => {
    if (fs.existsSync(path)) {
      open(path, app);
      let newHistory = [path, ...history.filter((p) => p !== path)];
      if (newHistory.length > historyLimit) {
        newHistory = newHistory.slice(0, historyLimit);
      }
      setHistory(newHistory);
      await LocalStorage.setItem("history", JSON.stringify(newHistory));
    } else {
      await showToast({
        style: Toast.Style.Failure,
        title: "Path does not exist",
      });
    }
  };

  return (
    <List
      filtering={filtering}
      throttle={true} // ensure that the input always remains at the top.
      searchText={inputText}
      onSearchTextChange={(text) => {
        setFiltering(true);
        setInputText(text);
      }}
      searchBarPlaceholder="Input Path"
      actions={<AppActionPanel path={inputText} openPath={openPath}></AppActionPanel>}
    >
      <List.Section title="Input History">
        <List.Item
          key={inputText}
          title={inputText}
          actions={<AppActionPanel path={inputText} openPath={openPath}></AppActionPanel>}
        />
        {history.map((path) => (
          <List.Item
            key={path}
            title={path}
            actions={<AppActionPanel path={path} openPath={openPath}></AppActionPanel>}
          />
        ))}
      </List.Section>
    </List>
  );
}
