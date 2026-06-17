import {
  Action,
  ActionPanel,
  Application,
  getPreferenceValues,
  Icon,
  List,
  showToast,
  Toast,
} from '@raycast/api';
import { useEffect, useState } from 'react';

import { OpenOnNetlify, OpenRepo } from './components/actions';
import { getDefaultTextEditor, tildifyPath, useDiskCache } from './utils/disk';
import { formatDate, snakeCaseToTitleCase } from './utils/helpers';

export default function Command() {
  const { scanPath } = getPreferenceValues<Preferences.FindLocalSites>();

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
    <List
      isLoading={isLoading}
      onSearchTextChange={setSearchText}
      searchBarPlaceholder="Filter local directories..."
    >
      {data?.dirs?.length === 0 && (
        <List.EmptyView
          title={`No Netlify directories found in ${scanPath}`}
          description="Run `netlify link` from a local repo to link a directory to a site."
        />
      )}
      <List.Section
        title={`${data?.dirs?.length || 0} site${
          data?.dirs?.length === 1 ? '' : 's'
        } found in local directories`}
      >
        {data?.dirs?.map((dir) => (
          <List.Item
            key={dir.fullPath}
            id={dir.fullPath}
            title={dir.name}
            icon={Icon.Folder}
            subtitle={tildifyPath(dir.fullPath)}
            accessories={[
              { text: formatDate(dir.lastModified), tooltip: 'Last modified' },
            ]}
            actions={
              <ActionPanel>
                <ActionPanel.Section>
                  {textEditor && (
                    <Action.Open
                      application={textEditor.bundleId}
                      icon={{ fileIcon: textEditor.path }}
                      target={dir.fullPath}
                      title={`Open in ${snakeCaseToTitleCase(textEditor.name)}`}
                    />
                  )}
                  <Action.ShowInFinder
                    path={dir.fullPath}
                    shortcut={{ modifiers: ['cmd'], key: 'return' }}
                  />
                </ActionPanel.Section>
                <ActionPanel.Section>
                  {dir.siteId && (
                    <OpenOnNetlify
                      url={`https://app.netlify.com/site-redirect/${dir.siteId}`}
                    />
                  )}
                  {dir.remotes.map((remote) => (
                    <OpenRepo key={remote.url} url={remote.url} />
                  ))}
                </ActionPanel.Section>
                <ActionPanel.Section>
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
