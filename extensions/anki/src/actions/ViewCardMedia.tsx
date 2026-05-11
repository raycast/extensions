import { useEffect, useMemo, useState } from 'react';
import { Action, ActionPanel, Grid, List } from '@raycast/api';
import { FieldMediaMap } from '../types';
import { useCachedPromise } from '@raycast/utils';
import mediaActions from '../api/mediaActions';
import useErrorHandling from '../hooks/useErrorHandling';

interface Props {
  cardMedia: FieldMediaMap;
}

export default function ViewCardMedia({ cardMedia }: Props) {
  const [searchText, setSearchText] = useState('');
  const [selectedField, setSelectedField] = useState('All');

  const { data: ankiMediaPath, isLoading, error } = useCachedPromise(mediaActions.getMediaDirPath);
  const { handleError } = useErrorHandling();

  const filteredCardMedia = useMemo(() => {
    let filtered =
      selectedField === 'All' ? cardMedia : { [selectedField]: cardMedia[selectedField] };

    if (searchText) {
      filtered = Object.fromEntries(
        Object.entries(filtered)
          .map(([fieldName, mediaFiles]) => [
            fieldName,
            mediaFiles.filter(
              file =>
                file.filename.toLowerCase().includes(searchText.toLowerCase()) ||
                fieldName.toLowerCase().includes(searchText.toLowerCase())
            ),
          ])
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
          .filter(([_, mediaFiles]) => mediaFiles.length > 0)
      );
    }

    return filtered;
  }, [cardMedia, selectedField, searchText]);

  useEffect(() => {
    if (error) {
      handleError(error);
    }
  }, [error]);

  const fieldNames = useMemo(() => ['All', ...Object.keys(cardMedia)], [cardMedia]);

  const fileGrid = useMemo(() => {
    return (
      <>
        {Object.entries(filteredCardMedia).map(([fieldName, mediaFiles]) => (
          <Grid.Section key={fieldName} title={fieldName}>
            {mediaFiles.map((file, index) => (
              <Grid.Item
                key={`${fieldName}-${index}`}
                content={{
                  source: `${ankiMediaPath}/${file.filename}`,
                  fallback: file.type === 'audio' ? 'music-icon.png' : 'video-icon.png',
                }}
                title={file.filename}
                subtitle={file.type}
                quickLook={{ path: `${ankiMediaPath}/${file.filename}` }}
                actions={
                  <ActionPanel>
                    <Action.ToggleQuickLook title="Preview" />
                  </ActionPanel>
                }
              />
            ))}
          </Grid.Section>
        ))}
      </>
    );
  }, [filteredCardMedia, ankiMediaPath]);

  const searchBarAccessory = useMemo(() => {
    return (
      <List.Dropdown
        tooltip="Filter by Field"
        storeValue={true}
        onChange={newValue => setSelectedField(newValue)}
      >
        <List.Dropdown.Section title="Fields">
          {fieldNames.map(fieldName => (
            <List.Dropdown.Item key={fieldName} title={fieldName} value={fieldName} />
          ))}
        </List.Dropdown.Section>
      </List.Dropdown>
    );
  }, [fieldNames, cardMedia]);

  return (
    <Grid
      isLoading={isLoading}
      columns={3}
      searchBarAccessory={searchBarAccessory}
      onSearchTextChange={setSearchText}
      searchBarPlaceholder="Search by file name"
      navigationTitle="Search Card Media"
      children={fileGrid}
    />
  );
}
