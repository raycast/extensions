import {
  Action,
  ActionPanel,
  Application,
  Icon,
  List,
  showToast,
  Toast,
} from '@raycast/api';
import { useEffect, useState } from 'react';

import { getDefaultTextEditor, tildifyPath, useDiskCache } from './utils/disk';
import {
  formatDate,
  getPreferences,
  snakeCaseToTitleCase,
} from './utils/helpers';

export default function Command() {
  const { scanPath } = getPreferences();

  const [searchText, setSearchText] = useState<string>();
  const [textEditor, setTextEditor] = useState<Application | null>(null);
  const { data, error, isLoading } = useDiskCache(searchText);

  useEffect(() => {
    async function getTextEditor() {
      const defaultTextEditor = await getDefaultTextEditor();
      setTextEditor(defaultTextEditor);
    }
    getTextEditor();
  }, []);

  if (error) {
    showToast(Toast.Style.Failure, '', error);
  }

  return (
    <List onSearchTextChange={setSearchText} isLoading={isLoading}>
      {data?.dirs?.length === 0 && (
        <List.EmptyView
          title={`No Netlify directories found in ${scanPath}`}
          description="Run `netlify link` from a local repo to link a directory to a site."
        />
      )}
      <List.Section
        title={`${data?.dirs?.length || 0} sites found in local directories`}
      >
        {data?.dirs?.map((dir) => (
          <List.Item
            key={dir.fullPath}
            id={dir.fullPath}
            title={dir.name}
            icon={Icon.Folder}
            subtitle={tildifyPath(dir.fullPath)}
            accessories={[{ text: formatDate(dir.lastModified) }]}
            actions={
              <ActionPanel>
                {textEditor && (
                  <Action.Open
                    application={textEditor.bundleId}
                    icon={{ fileIcon: textEditor.path }}
                    target={dir.fullPath}
                    title={`Open in ${snakeCaseToTitleCase(textEditor.name)}`}
                  />
                )}
                <ActionPanel.Section>
                  {dir.siteId && (
                    <Action.OpenInBrowser
                      shortcut={{ modifiers: ['cmd'], key: 'n' }}
                      title="Open on Netlify"
                      url={`https://app.netlify.com/site-redirect/${dir.siteId}`}
                    />
                  )}
                  {dir.remotes[0] && (
                    <Action.OpenInBrowser
                      shortcut={{ modifiers: ['cmd'], key: 'r' }}
                      title="Open Repository"
                      url={dir.remotes[0].url}
                    />
                  )}
                </ActionPanel.Section>
                <ActionPanel.Section>
                  <Action.ShowInFinder
                    path={dir.fullPath}
                    shortcut={{ modifiers: ['cmd'], key: 'return' }}
                  />
                  <Action.CopyToClipboard
                    title={'Copy Path to Clipboard'}
                    content={dir.fullPath}
                    shortcut={{ modifiers: ['cmd'], key: '.' }}
                  />
                </ActionPanel.Section>
              </ActionPanel>
            }
          />
        ))}
      </List.Section>
    </List>
  );
}
