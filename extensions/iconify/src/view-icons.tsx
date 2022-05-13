import { Action, ActionPanel, Color, List } from '@raycast/api';
import { useEffect, useState } from 'react';
import Service, { Icon, Set } from './service';
import { toBase64, toSvg } from './utils';

const service = new Service();

function Command() {
  const [sets, setSets] = useState<Set[]>([]);
  const [activeSetId, setActiveSetId] = useState<string>();
  const [icons, setIcons] = useState<Icon[]>([]);
  const [isLoading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchSets() {
      const sets = await service.listSets();
      setSets(sets);
    }

    fetchSets();
  }, []);

  useEffect(() => {
    async function fetchIcons() {
      if (!activeSetId) {
        return;
      }
      setLoading(true);
      setIcons([]);
      const activeSet = sets.find((set) => set.id === activeSetId);
      if (!activeSet) {
        setLoading(false);
        return;
      }
      const icons = await service.listIcons(activeSetId, activeSet.name);
      setIcons(icons);
      setLoading(false);
    }

    fetchIcons();
  }, [activeSetId]);

  return (
    <List
      isLoading={isLoading}
      searchBarAccessory={
        <List.Dropdown
          tooltip="Select an icon set"
          storeValue={true}
          onChange={setActiveSetId}
        >
          {sets.map((set) => (
            <List.Dropdown.Item key={set.id} title={set.name} value={set.id} />
          ))}
        </List.Dropdown>
      }
    >
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
