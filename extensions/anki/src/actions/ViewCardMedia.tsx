import { useEffect, useMemo, useState } from 'react';
import { Action, ActionPanel, Grid } from '@raycast/api';
import { FieldMediaMap } from '../types';
import { useCachedPromise } from '@raycast/utils';
import mediaActions from '../api/mediaActions';
import useErrorHandling from '../hooks/useErrorHandling';

interface Props {
  cardMedia: FieldMediaMap;
}

export default function ViewCardMedia({ cardMedia }: Props) {
  const [searchText, setSearchText] = useState('');
  const [selectedField, setSelectedField] = useState('');

  const { data: ankiMediaPath, isLoading, error } = useCachedPromise(mediaActions.getMediaDirPath);
  const { handleError } = useErrorHandling();

  const filteredCardMedia = useMemo(() => {
    const fieldName = selectedField.slice('field:'.length);
    let filtered =
      selectedField.startsWith('field:') &&
      Object.prototype.hasOwnProperty.call(cardMedia, fieldName)
        ? { [fieldName]: cardMedia[fieldName] }
        : cardMedia;

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

  const fieldNames = useMemo(() => Object.keys(cardMedia), [cardMedia]);

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
      <Grid.Dropdown
        tooltip="Filter by Field"
        value={
          selectedField.startsWith('field:') &&
          Object.prototype.hasOwnProperty.call(cardMedia, selectedField.slice('field:'.length))
            ? selectedField
            : ''
        }
        onChange={newValue => setSelectedField(newValue)}
      >
        <Grid.Dropdown.Item title="All Fields" value="" />
        <Grid.Dropdown.Section title="Fields">
          {fieldNames.map(fieldName => (
            <Grid.Dropdown.Item key={fieldName} title={fieldName} value={`field:${fieldName}`} />
          ))}
        </Grid.Dropdown.Section>
      </Grid.Dropdown>
    );
  }, [fieldNames, cardMedia, selectedField]);

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
