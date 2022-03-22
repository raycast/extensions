import { Action, ActionPanel, Clipboard, List, showHUD, showToast, Toast } from '@raycast/api';
import { useEffect, useState } from 'react';
import Service, { Icon, IconInfo, Set } from './service';
import { wrapIcon } from './utils';

const service = new Service();

function Command() {
  const [collections, setCollections] = useState<Set[]>([]);
  const [isLoading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchCollections() {
      const collections = await service.listSets();
      setCollections(collections);
      setLoading(false);
    }

    fetchCollections();
  }, []);

  return (
    <List isLoading={isLoading}>
      {collections.map((collection) => (
        <List.Item
          key={collection.id}
          title={collection.name}
          actions={
            <ActionPanel>
              <Action.Push
                title="Open Set"
                target={<SetView id={collection.id} />}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}

interface SetProps {
  id: string;
}

function SetView(props: SetProps) {
  const [iconInfos, setIconInfos] = useState<IconInfo[]>([]);
  const [isLoading, setLoading] = useState(true);

  const { id } = props;

  useEffect(() => {
    async function fetchIconInfo() {
      const iconInfos = await service.listIcons(id);
      setIconInfos(iconInfos);
      setLoading(false);
    }

    fetchIconInfo();
  }, []);

  async function copyIcon(iconId: string) {
    const toast = await showToast({
      title: 'Fetching the icon',
      style: Toast.Style.Animated,
    });
    const [{ body, height, width }] = await service.getIcons(id, [iconId]);
    const svg = wrapIcon(body, height, width);
    Clipboard.copy(svg);
    toast.hide();
    showHUD('Copied to Clipboard');
  }

  return (
    <List isLoading={isLoading}>
      {iconInfos.map((iconInfo) => {
        return (
          <List.Item
            key={iconInfo.id}
            title={iconInfo.id}
            actions={
              <ActionPanel>
                <Action title='Copy to Clipboard' onAction={() => copyIcon(iconInfo.id)} />
              </ActionPanel>
            }
          />
        );
      })}
    </List>
  );
}

export default Command;
