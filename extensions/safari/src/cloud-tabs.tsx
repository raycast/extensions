import {
  List,
  ActionPanel,
  environment,
  CopyToClipboardAction,
  OpenInBrowserAction,
  Detail,
  Icon,
  closeMainWindow,
  getPreferenceValues,
} from '@raycast/api';
import { useState, useEffect, useCallback, Fragment } from 'react';
import os from 'os';
import path from 'path';
import { promisify } from 'util';
import { readFile } from 'fs';
import _ from 'lodash';
import initSqlJs, { Database } from 'sql.js';
import execa from 'execa';
import { executeJxa, getTabUrl, getUrlDomain, getFaviconUrl, plural, permissionErrorMarkdown, search } from './shared';

const asyncReadFile = promisify(readFile);

// Preferences
type Preferences = {
  safariAppIdentifier: string;
};

const { safariAppIdentifier }: Preferences = getPreferenceValues();

// Current Device
const getCurrentDeviceName = (): string => {
  try {
    return execa.commandSync('/usr/sbin/scutil --get ComputerName').stdout;
  } catch (err) {
    console.error(err);
    return '';
  }
};

const currentDeviceName = getCurrentDeviceName();

// Cloud Tabs Database
const cloudTabsDbPath = `${os.homedir()}/Library/Safari/CloudTabs.db`;
let loadedDb: Database;
const loadDb = async (): Promise<Database> => {
  if (loadedDb) {
    return loadedDb;
  }

  const fileBuffer = await asyncReadFile(cloudTabsDbPath);
  const SQL = await initSqlJs({
    locateFile: () => path.join(environment.assetsPath, 'sql-wasm.wasm'),
  });

  const db = new SQL.Database(fileBuffer);
  loadedDb = db;

  return db;
};

const executeQuery = async (db: Database, query: string): Promise<unknown> => {
  const results = [];
  const stmt = db.prepare(query);
  while (stmt.step()) {
    results.push(stmt.getAsObject());
  }

  stmt.free();
  return results;
};

const fetchLocalTabs = (): Promise<LocalTab[]> =>
  executeJxa(`
    const safari = Application("${safariAppIdentifier}");
    const tabs = [];
    safari.windows().map(window => {
      return window.tabs().map(tab => {
        tabs.push({
          uuid: window.id() + '-' + tab.index(),
          title: tab.name(),
          url: tab.url() || '',
          window_id: window.id(),
          index: tab.index(),
          is_local: true
        });
      })
    });

    return tabs;
`);

const fetchRemoteTabs = async (): Promise<RemoteTab[]> => {
  try {
    const db = await loadDb();
    const tabs = (await executeQuery(
      db,
      `SELECT t.tab_uuid as uuid, d.device_uuid, d.device_name, t.title, t.url
         FROM cloud_tabs t
         INNER JOIN cloud_tab_devices d ON t.device_uuid = d.device_uuid
         WHERE device_name != "${currentDeviceName}"`
    )) as RemoteTab[];

    return tabs;
  } catch (err) {
    console.log(err);
    return [];
  }
};

const activateLocalTab = async (tab: LocalTab) =>
  executeJxa(`
      const safari = Application("Safari");
      const window = safari.windows.byId(${tab.window_id});
      const tab = window.tabs[${tab.index - 1}];
      window.index = 1;
      window.currentTab = tab;
      safari.activate();
  `);

const closeLocalTab = async (tab: LocalTab) =>
  executeJxa(`
    const safari = Application("Safari");
    const window = safari.windows.byId(${tab.window_id});
    const tab = window.tabs[${tab.index - 1}];
    tab.close();
`);

const openLocalTabWithSearch = async (searchText: string) =>
  executeJxa(`
      const safari = Application("Safari");
      safari.searchTheWeb({ for: "${searchText}" });
      safari.activate();
  `);

interface Tab {
  uuid: string;
  title: string;
  url: string;
  is_local: boolean;
}

interface RemoteTab extends Tab {
  device_uuid: string;
  device_name: string;
}

interface LocalTab extends Tab {
  window_id: number;
  index: number;
}

interface Device {
  uuid: string;
  name: string;
  tabs: LocalTab[] | RemoteTab[];
}

const formatTitle = (title: string) => _.truncate(title, { length: 75 });

const OpenTabAction = (props: { tab: Tab }) => {
  const { tab } = props;
  return tab.is_local ? (
    <ActionPanel.Item
      title="Open in Browser"
      icon={Icon.Globe}
      onAction={async () => {
        await activateLocalTab(tab as LocalTab);
        await closeMainWindow({ clearRootSearch: true });
      }}
    />
  ) : (
    <OpenInBrowserAction url={tab.url} />
  );
};

const CopyTabUrlAction = (props: { tab: Tab }) => <CopyToClipboardAction content={props.tab.url} title="Copy URL" />;

const CloseTabAction = (props: { tab: Tab; refreshTabs: () => void }) => {
  const { tab, refreshTabs } = props;
  return tab.is_local ? (
    <ActionPanel.Item
      title="Close Tab"
      icon={Icon.XmarkCircle}
      shortcut={{ modifiers: ['ctrl'], key: 'x' }}
      onAction={async () => {
        await closeLocalTab(tab as LocalTab);
        refreshTabs();
      }}
    />
  ) : (
    <Fragment />
  );
};

export default function Command() {
  const [hasPermissionError, setHasPermissionError] = useState(false);
  const [devices, setDevices] = useState<Device[]>();
  const [searchText, setSearchText] = useState<string>('');

  const fetchDevices = useCallback(async () => {
    try {
      const [localTabs, remoteTabs] = await Promise.all([fetchLocalTabs(), fetchRemoteTabs()]);
      const localDevice = {
        uuid: 'local',
        name: `${currentDeviceName} ★`,
        tabs: localTabs,
      };

      const removeDevices = _.transform(
        _.groupBy(remoteTabs, 'device_uuid'),
        (devices: Device[], tabs: RemoteTab[], device_uuid: string) => {
          devices.push({
            uuid: device_uuid,
            name: tabs[0].device_name,
            tabs,
          });
        },
        []
      );

      setDevices([localDevice, ...removeDevices]);
    } catch (err) {
      if (err instanceof Error && err.message.includes('operation not permitted')) {
        return setHasPermissionError(true);
      }

      throw err;
    }
  }, []);

  useEffect(() => {
    fetchDevices();
  }, [fetchDevices]);

  if (hasPermissionError) {
    return <Detail markdown={permissionErrorMarkdown} />;
  }

  return (
    <List isLoading={!devices} onSearchTextChange={setSearchText}>
      {_.map(devices, (device: Device) => {
        const tabs = search(device.tabs, ['title', 'url'], searchText) as Tab[];
        return (
          <List.Section key={device.uuid} title={device.name} subtitle={plural(tabs.length, 'tab')}>
            {tabs.map((tab: Tab) => {
              const url = getTabUrl(tab.url);
              const domain = getUrlDomain(url);
              return (
                <List.Item
                  key={tab.uuid}
                  title={formatTitle(tab.title)}
                  accessoryTitle={domain}
                  icon={getFaviconUrl(domain)}
                  actions={
                    <ActionPanel>
                      <OpenTabAction tab={tab} />
                      <CopyTabUrlAction tab={tab} />
                      <CloseTabAction tab={tab} refreshTabs={fetchDevices} />
                    </ActionPanel>
                  }
                />
              );
            })}
            {searchText !== '' && device.uuid === 'local' && (
              <List.Item
                key="fallback-search"
                title={`Search for "${searchText}"`}
                icon={Icon.MagnifyingGlass}
                actions={
                  <ActionPanel>
                    <ActionPanel.Item
                      title="Search in Browser"
                      icon={Icon.Globe}
                      onAction={async () => {
                        await openLocalTabWithSearch(searchText);
                        await closeMainWindow({ clearRootSearch: true });
                      }}
                    />
                  </ActionPanel>
                }
              />
            )}
          </List.Section>
        );
      })}
    </List>
  );
}
