import {useState} from 'react';
import {
  ActionPanel,
  Icon,
  List,
  PushAction,
  showToast,
  ToastStyle,
} from '@raycast/api';
import {useMemeSearch} from 'hooks';
import {GenerateForm, ImagePreview} from 'views';

export function Search() {
  const [searchText, setSearchText] = useState('');
  const {results, error} = useMemeSearch(searchText);

  if (error) {
    showToast(ToastStyle.Failure, 'Something went wrong', error);
  }

  return (
    <List
      onSearchTextChange={setSearchText}
      searchBarPlaceholder="Search for a meme..."
      throttle
    >
      {results && (
        <List.Section title="Results" subtitle={`${results.length}`}>
          {results.map(({item}) => (
            <List.Item
              key={item.id}
              title={item.name}
              icon={{source: item.url}}
              actions={
                <ActionPanel title={item.name}>
                  <PushAction
                    title="Select"
                    icon={{source: Icon.Pencil}}
                    shortcut={{modifiers: ['cmd'], key: 's'}}
                    target={<GenerateForm {...item} />}
                  />
                  <PushAction
                    title="Inspect"
                    icon={{source: Icon.MagnifyingGlass}}
                    shortcut={{modifiers: ['cmd'], key: 'i'}}
                    target={<ImagePreview {...item} />}
                  />
                </ActionPanel>
              }
            />
          ))}
        </List.Section>
      )}
    </List>
  );
}
