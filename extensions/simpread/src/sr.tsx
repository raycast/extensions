import {
  ActionPanel,
  OpenInBrowserAction,
  Icon,
  ImageMask,
  List,
  PushAction,
  Detail,
  getLocalStorageItem,
  getPreferenceValues,
  showToast,
  ToastStyle,
} from '@raycast/api';
import { readFileSync } from 'fs';
import { useEffect, useState } from 'react';
import { URL } from 'url';

import TurndownService from 'turndown';

interface Preferences {
  path: string;
}

interface State {
  items?: [];
  error?: Error;
}

interface Unread {
  id: number;
  idx: number;
  url: string;
  title: string;
  create: string;
  icon: string;
  favicon?: string;
  markdown?: string;
  desc?: string;
  note?: string;
  tags?: string[];
  annotations: Annote[];
}

interface Annote {
  id: number;
  type: string;
  html: string;
  text: string;
  note?: string;
  tags?: string[];
}

function getDetail(unread: Unread) {
  const turndown = new TurndownService(),
    fmtDate = (date: Date) => {
      const format = (value: any) => (value = value < 10 ? '0' + value : value);
      return (
        date.getFullYear() +
        '/' +
        format(date.getMonth() + 1) +
        '-' +
        format(date.getDate()) +
        ' ' +
        format(date.getHours()) +
        ':' +
        format(date.getMinutes()) +
        ':' +
        format(date.getSeconds())
      );
    };
  let tags = '',
    annotes = '';
  unread.tags && unread.tags.forEach((tag: string) => (tags += `#${tag} `));
  unread.annotations &&
    unread.annotations.forEach((annote: Annote) => {
      let tags = '',
        content = '';
      if (annote.type == 'paragraph') {
        content = turndown.turndown(annote.html);
      } else if (annote.type == 'img') {
        content = `![](${annote.text})`;
      } else if (annote.type == 'code') {
        content = '```\n' + annote.text.trim() + '\n```';
      }
      annote.tags && annote.tags.forEach((tag) => (tags += `#${tag} `));
      const date = new Date(annote.id),
        note = annote.note ? `> ${annote.note}` : '';
      annotes += `
${content}

${note}

${tags}

> ${fmtDate(date)}

***
`;
    });
  const host = new URL(unread.url).hostname,
    desc = unread.desc ? `> ${unread.desc}` : '',
    note = unread.note ? `> ${unread.note}` : '',
    template = `
# ${unread.title}

> Origin url [${host}](${unread.url}) at ${unread.create}

${desc}

${note}

${tags.trim()}

${annotes.trim().replace(/\*\*\*$/, '')}
`;
  return template;
}

export default function Command() {
  const [state, setState] = useState<State>({});
  const preferences: Preferences = getPreferenceValues();

  useEffect(() => {
    async function fetchUnrdist() {
      try {
        const favicon = 'favicon@default.png',
          path = await getLocalStorageItem('simpread_config_path'),
          config = readFileSync(!path ? preferences.path : path + '', 'utf8'),
          unrdist = JSON.parse(config).unrdist,
          items = unrdist
            .map((unread: Unread) => {
              let icon = unread.favicon;
              const now = new Date(unread.create);
              if (unread.favicon == undefined || unread.favicon == '') {
                icon = favicon;
              } else if (unread.favicon.startsWith('//res.wx.qq.com')) {
                icon = 'https:' + unread.favicon;
              } else if (unread.favicon.startsWith('/')) {
                icon = favicon;
              }
              return {
                id: unread.idx,
                title: unread.title,
                icon: icon,
                lastModifiedAt: now,
                desc: unread.desc,
                url: unread.url,
                markdown: getDetail(unread),
              };
            })
            .map((info: Unread, idx: number) => (
              <List.Item
                key={idx.toString()}
                title={info.title}
                subtitle={info.desc}
                icon={{ source: info.icon, mask: ImageMask.Circle }}
                actions={
                  <ActionPanel>
                    <ActionPanel.Section>
                      <OpenInBrowserAction title="Open Origin URL" url={info.url} />
                      <PushAction
                        title="Show Details"
                        target={<Detail markdown={info.markdown} />}
                        icon={{ source: 'sidebar-right-16' }}
                      />
                      <OpenInBrowserAction
                        title="Open Local File"
                        url={'http://localhost:7026/reading/' + info.id}
                        icon={Icon.Desktop}
                        shortcut={{ modifiers: ['cmd'], key: 'l' }}
                      />
                    </ActionPanel.Section>
                  </ActionPanel>
                }
              />
            ));
        setState({ items: items });
      } catch (error) {
        setState({ error: new Error('Something went wrong') });
      }
    }
    fetchUnrdist();
  }, []);

  if (state.error) {
    showToast(ToastStyle.Failure, 'Failed to get. Please confirm simpread_config.json it exists.');
  }

  return <List isLoading={state.items === undefined}>{state.items}</List>;
}
