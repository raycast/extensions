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
      if (defaultTextEditor) {
        setTextEditor(defaultTextEditor);
      }
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
        {data?.dirs?.map((dirs) => (
          <List.Item
            key={dirs.fullPath}
            id={dirs.fullPath}
            title={dirs.name}
            icon={Icon.Folder}
            subtitle={tildifyPath(dirs.fullPath)}
            accessories={[{ text: formatDate(dirs.lastModified) }]}
            actions={
              <ActionPanel>
                {textEditor && (
                  <Action.Open
                    application={textEditor.bundleId}
                    icon={{ fileIcon: textEditor.path }}
                    target={dirs.fullPath}
                    title={`Open in ${snakeCaseToTitleCase(textEditor.name)}`}
                  />
                )}
                <Action.ShowInFinder path={dirs.fullPath} />
                {dirs.siteId && (
                  <Action.OpenInBrowser
                    title="Open on Netlify"
                    url={`https://app.netlify.com/site-redirect/${dirs.siteId}`}
                  />
                )}
                {dirs.remotes.map((remote) => (
                  <Action.OpenInBrowser
                    key={`open remote ${remote.name}`}
                    title="Open Repository"
                    url={remote.url}
                  />
                ))}
                <Action.CopyToClipboard
                  title={'Copy Path to Clipboard'}
                  content={dirs.fullPath}
                  shortcut={{ modifiers: ['cmd'], key: '.' }}
                />
              </ActionPanel>
            }
          />
        ))}
      </List.Section>
    </List>
  );
}
