import { Action, ActionPanel, Color, List } from '@raycast/api';
import { useState } from 'react';

import Service, { Icon } from './service';
import { toBase64, toSvg } from './utils';

const service = new Service();

function Command() {
  const [icons, setIcons] = useState<Icon[]>([]);
  const [isLoading, setLoading] = useState(false);

  async function queryIcons(text: string) {
    setLoading(true);
    setIcons([]);
    const icons = await service.queryIcons(text);
    setIcons(icons);
    setLoading(false);
  }

  return (
    <List throttle isLoading={isLoading} onSearchTextChange={queryIcons}>
      {icons.map((icon) => {
        const { set, id, body, width, height } = icon;
        const { id: setId, title: setName } = set;
        const svgIcon = toSvg(body, width, height);
        const base64Icon = toBase64(svgIcon);
        return (
          <List.Item
            icon={{ source: base64Icon, tintColor: Color.PrimaryText }}
            key={`${setId}:${id}`}
            title={id}
            accessories={[
              {
                text: setName,
              },
            ]}
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
