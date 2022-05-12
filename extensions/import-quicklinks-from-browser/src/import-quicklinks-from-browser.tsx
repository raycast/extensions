import { Action, ActionPanel, environment, getPreferenceValues, List, showToast, Toast } from "@raycast/api";
import { homedir } from "os";
import { useEffect, useState } from "react";
import initSqlJs, { Database } from "sql.js";
import path from "path";
import { existsSync, readdirSync, readFileSync } from "fs";

const QUERY = "SELECT id, short_name, url, keyword, favicon_url, is_active FROM keywords";
const BASE_SUPPORT_DIR = `${homedir()}/Library/Application Support`;

const SUPPORT_DIRS = {
  chrome: `${BASE_SUPPORT_DIR}/Google/Chrome`,
  chromium: `${BASE_SUPPORT_DIR}/Chromium`,
  edge: `${BASE_SUPPORT_DIR}/Microsoft Edge`,
  vivaldi: `${BASE_SUPPORT_DIR}/Vivaldi`,
  brave: `${BASE_SUPPORT_DIR}/BraveSoftware/Brave-Browser`,
};

interface CustomSearchEngine {
  id: number;
  short_name: string;
  url: string;
  keyword: string;
  favicon_url: string;
  is_active: boolean;
}

interface ChromeProfile {
  title: string;
  database: string;
}

function deduplicate(items: CustomSearchEngine[]) {
  const map = new Map<string, CustomSearchEngine>();
  for (const item of items) {
    map.set(item.url, item);
  }
  return Array.from(map.values());
}

const loadDb = async (dbPath: string): Promise<Database> => {
  const fileBuffer = readFileSync(dbPath);
  const SQL = await initSqlJs({
    locateFile: () => path.join(environment.assetsPath, "sql-wasm.wasm"),
  });
  return new SQL.Database(fileBuffer);
};

function DataBaseDropdown(props: { profiles: ChromeProfile[]; setDatabasePath: (path: string) => void }) {
  return (
    <List.Dropdown tooltip="Filter by Profile" storeValue={true} onChange={props.setDatabasePath}>
      {props.profiles?.map((profile) => (
        <List.Dropdown.Item key={profile.database} title={profile.title} value={profile.database} />
      ))}
    </List.Dropdown>
  );
}

function CustomSearchEngineItem(props: { searchEngine: CustomSearchEngine }) {
  const link = props.searchEngine.url.replace("searchTerms", "Query");

  return (
    <List.Item
      icon={props.searchEngine.favicon_url}
      title={props.searchEngine.short_name}
      subtitle={link}
      actions={
        <ActionPanel>
          <Action.CreateQuicklink
            icon={props.searchEngine.favicon_url}
            quicklink={{ link, name: props.searchEngine.short_name }}
          />
        </ActionPanel>
      }
    />
  );
}

export default function ListSearchEngine() {
  const { browser } = getPreferenceValues();
  const supportDir = SUPPORT_DIRS[browser as keyof typeof SUPPORT_DIRS];
  const [state, setState] = useState<{
    databasePath: string;
    profiles: ChromeProfile[];
    searchEngines: CustomSearchEngine[];
    isLoading: boolean;
  }>({ databasePath: "", searchEngines: [], profiles: [], isLoading: true });

  useEffect(() => {
    if (!existsSync(supportDir)) {
      showToast({
        title: `${browser} is not installed`,
        message: `Please install ${browser}, or update the browser preference`,
        style: Toast.Style.Failure,
      });
      setState({ ...state, isLoading: false });
      return;
    }

    const profiles = readdirSync(supportDir)
      .map((directory) => ({
        title: path.basename(directory),
        database: path.join(supportDir, directory, "Web Data"),
      }))
      .filter((profile) => profile.title === "Default" || profile.title.startsWith("Profile"));
    if (profiles.length === 0) {
      showToast({
        title: `No profile found`,
        message: `Please check your ${browser} installation, or update the browser preference`,
        style: Toast.Style.Failure,
      });
      setState({ ...state, isLoading: false });
      return;
    }

    setState({ ...state, profiles });
  }, []);

  useEffect(() => {
    if (!state.databasePath) {
      return;
    }
    loadDb(state.databasePath).then((db) => {
      const res = db.exec(QUERY);
      const searchEngines = res[0].values.map((row) => {
        const [id, short_name, url, keyword, favicon_url, is_active] = row;
        return {
          id: id as number,
          short_name: short_name as string,
          url: url as string,
          keyword: keyword as string,
          favicon_url: favicon_url as string,
          is_active: is_active === 1,
        };
      });
      setState({ ...state, isLoading: false, searchEngines: deduplicate(searchEngines) });
    });
  }, [state.databasePath]);

  return (
    <List
      isLoading={state.isLoading}
      searchBarAccessory={
        <DataBaseDropdown
          profiles={state.profiles}
          setDatabasePath={(databasePath) => setState({ ...state, databasePath })}
        />
      }
    >
      <List.Section title="Custom">
        {state.searchEngines
          ?.filter((se) => se.is_active)
          ?.map((se) => (
            <CustomSearchEngineItem key={se.id} searchEngine={se} />
          ))}
      </List.Section>
      <List.Section title="Automatic">
        {state.searchEngines
          ?.filter((se) => !se.is_active)
          ?.map((se) => (
            <CustomSearchEngineItem key={se.id} searchEngine={se} />
          ))}
      </List.Section>
    </List>
  );
}
