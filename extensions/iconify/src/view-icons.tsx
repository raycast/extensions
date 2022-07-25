import { Action, ActionPanel, Color, List, Cache } from '@raycast/api';
import { useEffect, useState } from 'react';
import Service, { Icon, Set } from './service';
import { toDataURI, toSvg, toURL } from './utils';

const service = new Service();
const cache = new Cache({
  capacity: 50 * 1e6,
});

const day = 24 * 60 * 60 * 1e3;
const isExpired = (time: number) => Date.now() - time > day;

function Command() {
  const [sets, setSets] = useState<Set[]>([]);
  const [activeSetId, setActiveSetId] = useState<string>();
  const [icons, setIcons] = useState<Icon[]>([]);
  const [isLoading, setLoading] = useState(true);

  useEffect(() => {
    const cacheId = 'sets';
    async function fetchSets() {
      const sets = await service.listSets();
      cache.set(cacheId, JSON.stringify({ time: Date.now(), data: sets }));
      setSets(sets);
    }

    if (cache.has(cacheId)) {
      const { time, data } = JSON.parse(cache.get(cacheId)!);
      if (!isExpired(time)) {
        setSets(data);
        return;
      }
    }

    fetchSets();
  }, []);

  useEffect(() => {
    const cacheId = `set-${activeSetId}`;
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
      cache.set(cacheId, JSON.stringify({ time: Date.now(), data: icons }));
      setIcons(icons);
      setLoading(false);
    }

    if (cache.has(cacheId)) {
      const { time, data } = JSON.parse(cache.get(cacheId)!);
      if (!isExpired(time)) {
        setIcons(data);
        setLoading(false);
        return;
      }
    }

    fetchIcons();
  }, [activeSetId]);

  return (
    <List
      isLoading={isLoading}
      searchBarAccessory={
        <List.Dropdown
          tooltip="Select Icon Set"
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
        const dataURIIcon = toDataURI(svgIcon);
        return (
          <List.Item
            icon={{
              source: dataURIIcon,
              tintColor: body.includes('currentColor')
                ? Color.PrimaryText // Monochrome icon
                : null,
            }}
            key={id}
            title={id}
            actions={
              <ActionPanel>
                <Action.Paste content={svgIcon} />
                <Action.CopyToClipboard content={svgIcon} />
                <Action.CopyToClipboard
                  title="Copy Name"
                  content={`${activeSetId}:${id}`}
                />
                <Action.CopyToClipboard
                  title="Copy URL"
                  content={toURL(activeSetId!, id)}
                />
              </ActionPanel>
            }
          />
        );
      })}
    </List>
  );
}

export default Command;
