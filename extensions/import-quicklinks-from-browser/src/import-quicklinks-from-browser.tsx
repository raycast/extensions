import { Action, ActionPanel, environment, getPreferenceValues, List } from "@raycast/api";
import { homedir } from "os";
import { useEffect, useState } from "react";
import initSqlJs, { Database } from "sql.js";
import path from "path";
import { readdirSync, readFileSync } from "fs";

const QUERY = "SELECT id, short_name, url, keyword, favicon_url FROM keywords WHERE is_active = 1";
const BASE_SUPPORT_DIR = `${homedir()}/Library/Application Support`;

const SUPPORT_DIRS = {
  chrome: `${BASE_SUPPORT_DIR}/Google/Chrome`,
  chromium: `${BASE_SUPPORT_DIR}/Chromium`,
  edge: `${BASE_SUPPORT_DIR}/Microsoft Edge`,
  vivaldi: `${BASE_SUPPORT_DIR}/Microsoft Edge`,
  brave: `${BASE_SUPPORT_DIR}/BraveSoftware/Brave-Browser`,
};

interface CustomSearchEngine {
  id: number;
  short_name: string;
  url: string;
  keyword: string;
  favicon_url: string;
}

interface ChromeProfile {
  title: string;
  database: string;
}

const loadDb = async (dbPath: string): Promise<Database> => {
  const fileBuffer = readFileSync(dbPath);
  const SQL = await initSqlJs({
    locateFile: () => path.join(environment.assetsPath, "sql-wasm.wasm"),
  });
  return new SQL.Database(fileBuffer);
};

function DataBaseDropdown(props: { setDatabasePath: (profile: string) => void }) {
  const [profiles, setProfiles] = useState<ChromeProfile[]>();
  const { browser } = getPreferenceValues();
  const supportDir = SUPPORT_DIRS[browser as keyof typeof SUPPORT_DIRS];

  useEffect(() => {
    const directories = readdirSync(supportDir);
    const profiles = directories.map((directory) => ({
      title: path.basename(directory),
      database: path.join(supportDir, directory, "Web Data"),
    }));
    setProfiles(profiles.filter((profile) => profile.title === "Default" || profile.title.startsWith("Profile")));
  }, []);

  return (
    <List.Dropdown tooltip="Filter by Profile" storeValue={true} onChange={props.setDatabasePath}>
      {profiles?.map((profile) => (
        <List.Dropdown.Item key={profile.database} title={profile.title} value={profile.database} />
      ))}
    </List.Dropdown>
  );
}

export default function ListQuickLinks() {
  const [searchEngines, setSearchEngines] = useState<CustomSearchEngine[]>();
  const [databasePath, setDatabasePath] = useState<string>();

  useEffect(() => {
    if (typeof databasePath === "undefined") {
      return;
    }
    loadDb(databasePath).then((db) => {
      const res = db.exec(QUERY);
      const searchEngines = res[0].values.map((row) => {
        const [id, short_name, url, keyword, favicon_url] = row;
        return {
          id: id as number,
          short_name: short_name as string,
          url: url as string,
          keyword: keyword as string,
          favicon_url: favicon_url as string,
        };
      });
      setSearchEngines(searchEngines);
    });
  }, [databasePath]);

  return (
    <List
      isLoading={typeof searchEngines === "undefined"}
      searchBarAccessory={<DataBaseDropdown setDatabasePath={setDatabasePath} />}
    >
      {searchEngines?.map((se) => {
        const link = se.url.replace("searchTerms", "Query");

        return (
          <List.Item
            key={se.id}
            icon={se.favicon_url}
            title={se.short_name}
            subtitle={link}
            actions={
              <ActionPanel>
                <Action.CreateQuicklink icon={se.favicon_url} quicklink={{ link, name: se.short_name }} />
              </ActionPanel>
            }
          />
        );
      })}
    </List>
  );
}
