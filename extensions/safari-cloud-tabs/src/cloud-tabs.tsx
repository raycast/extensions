import { List, ActionPanel, OpenInBrowserAction, environment } from '@raycast/api';
import { useState, useEffect } from 'react';
import os from 'os';
import { promisify } from 'util';
import { exec } from 'child_process';
import csvToJson from 'csvtojson';
import _ from 'lodash';

const asyncExec = promisify(exec);
const cloudTabsDbPath = `${os.homedir()}/Library/Safari/CloudTabs.db`;

const executeQuery = async (query: string) => {
  const { stdout, stderr } = await asyncExec(`echo "${query}" | sqlite3 "${cloudTabsDbPath}" -header -csv`);
  if (stderr) {
    throw new Error(stderr);
  }

  return csvToJson().fromString(stdout);
};

interface Tab {
  tab_uuid: string;
  device_uuid: string;
  device_name: string;
  title: string;
  url: string;
  position: string;
  is_showing_reader: string;
  is_pinned: string;
  reader_scroll_position_page_index: string;
}

const formatTitle = (title: string) => _.truncate(title, { length: 75 });
const getProtocolLessUrl = (url: string) => url.replace(/(^\w+:|^)\/\//, '').replace('www.', '');
const getFaviconUrl = (url: string) => {
  const domain = getProtocolLessUrl(url).split('/')[0];
  return `https://www.google.com/s2/favicons?sz=64&domain=${encodeURI(domain)}`;
};

export default function Command() {
  const [tabs, setTabs] = useState<Tab[]>();
  useEffect(() => {
    const getTabs = async () => {
      const tabs = await executeQuery(`
        SELECT * FROM cloud_tabs t
        INNER JOIN cloud_tab_devices d
        ON t.device_uuid = d.device_uuid
      `);

      setTabs(tabs);
    };

    getTabs();
  }, []);

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
