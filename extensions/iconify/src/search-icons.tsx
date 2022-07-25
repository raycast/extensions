import { Action, ActionPanel, Color, List } from '@raycast/api';
import { useState } from 'react';

import Service, { Icon } from './service';
import { toDataURI, toSvg, toURL } from './utils';

const service = new Service();

function Command() {
  const [icons, setIcons] = useState<Icon[]>([]);
  const [isLoading, setLoading] = useState(false);
  const [query, setQuery] = useState('');

  async function queryIcons(text: string) {
    setQuery(text);
    setLoading(true);
    const icons = await service.queryIcons(text);
    setIcons(icons);
    setLoading(false);
  }

  function getEmptyViewDescription(query: string) {
    if (query.length === 0) {
      return 'Type something to get started';
    }
    return 'Try another query';
  }

  return (
    <List throttle isLoading={isLoading} onSearchTextChange={queryIcons}>
      <List.EmptyView
        title="No results"
        description={getEmptyViewDescription(query)}
      />
      {icons.map((icon) => {
        const { set, id, body, width, height } = icon;
        const { id: setId, title: setName } = set;
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
            key={`${setId}:${id}`}
            title={id}
            accessories={[
              {
                text: setName,
              },
            ]}
            actions={
              <ActionPanel>
                <Action.Paste content={svgIcon} />
                <Action.CopyToClipboard content={svgIcon} />
                <Action.CopyToClipboard
                  title="Copy Name"
                  content={`${setId}:${id}`}
                />
                <Action.CopyToClipboard
                  title="Copy URL"
                  content={toURL(setId, id)}
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
