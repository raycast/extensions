import {
  List,
  ActionPanel,
  environment,
  CopyToClipboardAction,
  OpenInBrowserAction,
  Detail,
  showToast,
  ToastStyle,
  Icon,
  closeMainWindow,
} from '@raycast/api';
import { useState, useEffect, useCallback } from 'react';
import osascript from 'osascript-tag';
import os from 'os';
import path from 'path';
import { promisify } from 'util';
import { readFile } from 'fs';
import _ from 'lodash';
import initSqlJs, { Database } from 'sql.js';
import execa from 'execa';
import { getTabUrl, getUrlDomain, getFaviconUrl, plural, permissionErrorMarkdown } from './shared';

const asyncReadFile = promisify(readFile);

const cloudTabsDbPath = `${os.homedir()}/Library/Safari/CloudTabs.db`;

const getCurrentDeviceName = (): string => {
  try {
    return execa.commandSync('/usr/sbin/scutil --get ComputerName').stdout;
  } catch (err) {
    console.error(err);
    return '';
  }
};

const currentDeviceName = getCurrentDeviceName();

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

const executeJxa = async (script: string) => {
  try {
    const result = await osascript.jxa({ parse: true })`${script}`;
    return result;
  } catch (err: unknown) {
    if (typeof err === 'string') {
      const message = err.replace('execution error: Error: ', '');
      if (message.match(/Application can't be found/)) {
        showToast(ToastStyle.Failure, 'Application not found', 'Things must be running');
      } else {
        showToast(ToastStyle.Failure, 'Something went wrong', message);
      }
    }
  }
};

const fetchLocalTabs = (): Promise<Tab[]> =>
  executeJxa(`
    const safari = Application("Safari");
    const tabs = [];
    safari.windows().map(window => {
      return window.tabs().map(tab => {
        tabs.push({
          window_id: window.id(),
          index: tab.index(),
          title: tab.name(),
          url: tab.url(),
          is_local: true
        });
      })
    });

    return tabs;
`);

const fetchRemoteTabs = async (): Promise<Tab[]> => {
  const db = await loadDb();
  const tabs = (await executeQuery(
    db,
    `SELECT t.tab_uuid as uuid, d.device_uuid, d.device_name, t.title, t.url
         FROM cloud_tabs t
         INNER JOIN cloud_tab_devices d ON t.device_uuid = d.device_uuid
         WHERE device_name != "${currentDeviceName}"`
  )) as Tab[];

  return tabs;
};

const activateLocalTab = async (tab: Tab) =>
  executeJxa(`
    const safari = Application("Safari");
    const window = safari.windows.byId(${tab.window_id});
    const tab = window.tabs[${tab.index - 1}];
    window.index = 1;
    window.currentTab = tab;
    safari.activate();
`);

const closeLocalTab = async (tab: Tab) => {
  await showToast(ToastStyle.Success, 'Tab Closed', 'It will take a few seconds to take effect.');
};

interface Tab {
  uuid: string;
  title: string;
  url: string;
  device_uuid: string;
  device_name: string;
  window_id: number;
  index: number;
  is_local?: boolean;
}

interface Device {
  uuid: string;
  name: string;
  tabs: Tab[];
}

const formatTitle = (title: string) => _.truncate(title, { length: 75 });

export default function Command() {
  const [hasPermissionError, setHasPermissionError] = useState(false);
  const [devices, setDevices] = useState<Device[]>();

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
        (devices: Device[], tabs: Tab[], device_uuid: string) => {
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
    <List isLoading={!devices}>
      {_.map(devices, (device: Device) => (
        <List.Section key={device.uuid} title={device.name} subtitle={plural(device.tabs.length, 'tab')}>
          {_.map(device.tabs, (tab: Tab) => {
            const url = getTabUrl(tab.url);
            const domain = getUrlDomain(url);
            return (
              <List.Item
                key={tab.uuid}
                title={formatTitle(tab.title)}
                accessoryTitle={domain}
                keywords={[url, domain]}
                icon={getFaviconUrl(domain)}
                actions={
                  <ActionPanel>
                    {tab.is_local && (
                      <ActionPanel.Item
                        title="Open in Browser"
                        icon={Icon.Globe}
                        onAction={async () => {
                          await activateLocalTab(tab);
                          await closeMainWindow({ clearRootSearch: true });
                        }}
                      />
                    )}
                    {!tab.is_local && <OpenInBrowserAction url={tab.url} />}
                    <CopyToClipboardAction content={url} title="Copy URL" />
                    {tab.is_local && (
                      <ActionPanel.Item
                        title="Close Tab"
                        icon={Icon.XmarkCircle}
                        shortcut={{ modifiers: ['ctrl'], key: 'x' }}
                        onAction={() => closeLocalTab(tab)}
                      />
                    )}
                  </ActionPanel>
                }
              />
            );
          })}
        </List.Section>
      ))}
    </List>
  );
}
