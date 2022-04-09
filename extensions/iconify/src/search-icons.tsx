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
        const { setId, id, body, width, height } = icon;
        const svgIcon = toSvg(body, width, height);
        const base64Icon = toBase64(svgIcon);
        return (
          <List.Item
            icon={{ source: base64Icon, tintColor: Color.PrimaryText }}
            key={`${setId}:${id}`}
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
