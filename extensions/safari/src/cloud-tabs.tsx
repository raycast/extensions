import { List, ActionPanel, Icon, environment, OpenAction, Detail } from '@raycast/api';
import { useState, useEffect, useCallback } from 'react';
import os from 'os';
import path from 'path';
import { promisify } from 'util';
import { readFile } from 'fs';
import _ from 'lodash';
import initSqlJs, { Database, ParamsObject } from 'sql.js';
import execa from 'execa';
import { getUrlDomain, getFaviconUrl, plural, permissionErrorMarkdown } from './shared';

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
  uuid: string;
  title: string;
  url: string;
  domain: string;
  position: string; // @TODO handle value to sort tabs
  device_uuid: string;
  device_name: string;
}

interface Device {
  uuid: string;
  name: string;
  is_current: boolean;
  tabs: Tab[];
}

const formatTitle = (title: string) => _.truncate(title, { length: 75 });

export default function Command() {
  const [hasPermissionError, setHasPermissionError] = useState(false);
  const [devices, setDevices] = useState<Device[]>();

  const fetchDevices = useCallback(async () => {
    try {
      const db = await loadDb();
      const currentDeviceName = getCurrentDeviceName();
      const tabs = (await executeQuery(
        db,
        `SELECT t.tab_uuid as uuid, d.device_uuid, d.device_name, t.title, t.url, t.position
         FROM cloud_tabs t
         INNER JOIN cloud_tab_devices d ON t.device_uuid = d.device_uuid`
      )) as unknown as Tab[];

      const devices = _.chain(tabs)
        .groupBy('device_uuid')
        .reduce((devices: Device[], tabs: Tab[], device_uuid: string) => {
          devices.push({
            uuid: device_uuid,
            name: tabs[0].device_name,
            is_current: currentDeviceName === tabs[0].device_name,
            tabs: _.map(tabs, (tab) => ({ ...tab, domain: getUrlDomain(tab.url) })),
          });

          return devices;
        }, [])
        .orderBy('is_current', 'desc')
        .value();

      setDevices(devices);
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
          {_.map(device.tabs, (tab: Tab) => (
            <List.Item
              key={tab.uuid}
              title={formatTitle(tab.title)}
              accessoryTitle={tab.domain}
              keywords={[tab.url, tab.domain]}
              icon={getFaviconUrl(tab.domain)}
              actions={
                <ActionPanel>
                  <OpenAction title="Open in Safari" target={tab.url} application="Safari" icon={Icon.Globe} />
                </ActionPanel>
              }
            />
          ))}
        </List.Section>
      ))}
    </List>
  );
}
