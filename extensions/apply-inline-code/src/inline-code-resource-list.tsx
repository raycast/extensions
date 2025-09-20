import { nanoid } from 'nanoid';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActionPanel, Color, Icon, List, Toast, showToast, useNavigation } from '@raycast/api';
import {
  DeleteResourceAction,
  EditResourceAction,
  CreateResourceAction,
  OpenResourceAction,
  EmptyView,
} from './components';
import { Resource } from './types/resource';
import { modifierSymbolMap } from './constants/modifiers';
import resourceService from './services/resource';

type State = {
  isLoading: boolean;
  searchText: string;
  filter: string;
};

export default function InlineCodeResourceList() {
  const { pop } = useNavigation();
  const [state, setState] = useState<State>({
    isLoading: true,
    searchText: '',
    filter: '',
  });
  const [resources, setResources] = useState<Resource[]>([]);

  useEffect(() => {
    (async () => {
      const storedData = await resourceService.getResources();

      setResources(storedData);
      setState(previous => ({ ...previous, isLoading: false }));
    })();
  }, []);

  useEffect(() => {
    setResources(resources);
  }, [resources]);

  const handleCreate = useCallback(
    async (createData: Omit<Resource, 'id'>) => {
      if (
        resources.some(
          resource => resource.name === createData.name && resource.type === createData.type,
        )
      ) {
        return showToast({
          title: `${createData.type}: ${createData.name} already exists`,
          message: `Please provide a unique name for the ${createData.type}`,
          style: Toast.Style.Failure,
        });
      }

      const newResources = [
        ...resources,
        {
          ...createData,
          id: nanoid(),
        },
      ] as Resource[];

      setResources(newResources);
      resourceService.setResources(newResources);

      showToast({
        title: 'Website config created',
        message: 'Please provide a unique title for the website',
        style: Toast.Style.Success,
      });
      pop();
    },
    [resources],
  );

  const handleEdit = useCallback(
    (values: Resource) => {
      const newResources = resources.map(resource => {
        if (resource.id === values.id) {
          return values;
        }
        return resource;
      });
      setResources(newResources);
      pop();
    },
    [resources, setResources],
  );

  const handleDelete = useCallback(
    (id: string) => {
      const newResources = resources.filter(resource => resource.id !== id);
      setResources(newResources);
    },
    [resources, setResources],
  );

  const filteredResources = useMemo(() => {
    return resources.filter(resource => {
      if (!resource.name.toLowerCase().includes(state.searchText.toLowerCase())) {
        return false;
      }

      if (state.filter === 'all') {
        return true;
      }
      return resource.type === state.filter;
    });
  }, [resources, state.filter, state.searchText]);

  return (
    <List
      isLoading={state.isLoading}
      searchText={state.searchText}
      searchBarAccessory={
        <List.Dropdown
          tooltip="Select Todo List"
          value={state.filter}
          onChange={newValue => setState(previous => ({ ...previous, filter: newValue }))}
        >
          <List.Dropdown.Item title="All" value="all" />
          <List.Dropdown.Item title="Websites" value="website" />
          <List.Dropdown.Item title="Application" value="application" />
        </List.Dropdown>
      }
      onSearchTextChange={newValue => {
        setState(previous => ({ ...previous, searchText: newValue }));
      }}
    >
      <EmptyView filter={state.filter} searchText={state.searchText} onCreate={handleCreate} />
      {filteredResources.map(resource => {
        const { id, type, name, modifiers, key } = resource;
        const isWebsite = type === 'website';
        const url = isWebsite ? resource?.url : undefined;
        const modifiersString = modifiers
          .map(modifier => modifierSymbolMap[modifier])
          .concat([key.toUpperCase()])
          .join(' + ');

        return (
          <List.Item
            id={id}
            key={id}
            icon={isWebsite ? Icon.Globe : Icon.AppWindowGrid2x2}
            title={name}
            subtitle={url}
            accessories={[
              { text: { value: modifiersString, color: Color.Yellow } },
              { text: type },
            ].filter(Boolean)}
            actions={
              <ActionPanel>
                <ActionPanel.Section>
                  <OpenResourceAction resource={resource} />
                  <EditResourceAction onEdit={handleEdit} defaultValues={resource} />
                  <DeleteResourceAction onDelete={() => handleDelete(id)} />
                </ActionPanel.Section>
                <ActionPanel.Section>
                  <CreateResourceAction onCreate={handleCreate} />
                </ActionPanel.Section>
              </ActionPanel>
            }
          />
        );
      })}
    </List>
  );
}
