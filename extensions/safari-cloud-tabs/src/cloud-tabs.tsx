import { List, ActionPanel, OpenInBrowserAction, environment } from '@raycast/api';
import { useState, useEffect, useCallback } from 'react';
import os from 'os';
import path from 'path';
import { promisify } from 'util';
import { readFile } from 'fs';
import _ from 'lodash';
import initSqlJs, { Database, ParamsObject } from 'sql.js';

const asyncReadFile = promisify(readFile);
const cloudTabsDbPath = `${os.homedir()}/Library/Safari/CloudTabs.db`;

const loadDb = async (): Promise<Database> => {
  const fileBuffer = await asyncReadFile(cloudTabsDbPath);
  const SQL = await initSqlJs({
    locateFile: () => path.join(environment.assetsPath, 'sql-wasm.wasm'),
  });

  return new SQL.Database(fileBuffer);
};

const executeQuery = async (db: Database, query: string): Promise<ParamsObject[]> => {
  const results = [];
  const stmt = db.prepare(query);
  while (stmt.step()) {
    results.push(stmt.getAsObject());
  }

  stmt.free();
  return results;
};

interface Tab {
  tab_uuid: string;
  device_uuid: string;
  device_name: string;
  title: string;
  url: string;
  position: string;
}

const formatTitle = (title: string) => _.truncate(title, { length: 75 });
const getProtocolLessUrl = (url: string) => url.replace(/(^\w+:|^)\/\//, '').replace('www.', '');
const getFaviconUrl = (url: string) => {
  const domain = getProtocolLessUrl(url).split('/')[0];
  return `https://www.google.com/s2/favicons?sz=64&domain=${encodeURI(domain)}`;
};

export default function Command() {
  const [tabs, setTabs] = useState<Tab[]>();

  const fetchTabs = useCallback(async () => {
    const db = await loadDb();
    const tabs = (await executeQuery(
      db,
      `SELECT t.tab_uuid, d.device_uuid, d.device_name, t.title, t.url, t.position
       FROM cloud_tabs t
       INNER JOIN cloud_tab_devices d ON t.device_uuid = d.device_uuid`
    )) as unknown as Tab[];

    setTabs(tabs);
  }, []);

  useEffect(() => {
    fetchTabs();
  }, [fetchTabs]);

  const groupedTabs = _.groupBy(tabs, 'device_uuid');

  return (
    <List isLoading={!tabs}>
      {_.map(groupedTabs, (tabs: Tab[], deviceId: string) => (
        <List.Section key={deviceId} title={tabs[0].device_name}>
          {_.map(tabs, (tab: Tab) => (
            <List.Item
              key={tab.tab_uuid}
              title={formatTitle(tab.title)}
              subtitle={getProtocolLessUrl(tab.url)}
              icon={getFaviconUrl(tab.url)}
              actions={
                <ActionPanel>
                  <OpenInBrowserAction url={tab.url} />
                  {environment.isDevelopment && <ActionPanel.Item title="Log" onAction={() => console.log(tab)} />}
                </ActionPanel>
              }
            />
          ))}
        </List.Section>
      ))}
    </List>
  );
}
