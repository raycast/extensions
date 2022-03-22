import {
  Action,
  ActionPanel,
  Clipboard,
  Color,
  List,
  showHUD,
  showToast,
  Toast,
} from '@raycast/api';
import { useEffect, useState } from 'react';

import Service, { Icon, Set } from './service';
import { toSvg, toBase64 } from './utils';

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
  const [icons, setIcons] = useState<Icon[]>([]);
  const [isLoading, setLoading] = useState(true);

  const { id } = props;

  useEffect(() => {
    async function fetchIcons() {
      setLoading(true);
      setIcons([]);
      const icons = await service.listIcons(id);
      setIcons(icons);
      setLoading(false);
    }

    fetchIcons();
  }, []);

  return (
    <List isLoading={isLoading}>
      {icons.map((icon) => {
        const { id, body, width, height } = icon;
        const svgIcon = toSvg(body, width, height);
        const base64Icon = toBase64(svgIcon);
        return (
          <List.Item
            icon={{ source: base64Icon, tintColor: Color.PrimaryText }}
            key={id}
            title={id}
            actions={
              <ActionPanel>
                <Action.CopyToClipboard content={svgIcon} />
              </ActionPanel>
            }
          />
        );
      })}
    </List>
  );
}

export default Command;
