import {
  Action,
  ActionPanel,
  Color,
  Grid,
  getPreferenceValues,
} from '@raycast/api';
import { useState } from 'react';

import Service, { Icon } from './service';
import { toDataURI, toSvg, toURL, Preferences } from './utils';

const { primaryAction, showName, showSet }: Preferences = getPreferenceValues();

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

  function getEmptyViewDescription(query: string, isLoading: boolean) {
    if (query.length === 0 || isLoading) {
      return 'Type something to get started';
    }
    return 'Try another query';
  }

  return (
    <Grid
      throttle
      isLoading={isLoading}
      onSearchTextChange={queryIcons}
      itemSize={Grid.ItemSize.Small}
      inset={Grid.Inset.Large}
    >
      <Grid.EmptyView
        title="No results"
        description={getEmptyViewDescription(query, isLoading)}
      />
      {icons.map((icon) => {
        const { set, id, body, width, height } = icon;
        const { id: setId, title: setName } = set;
        const svgIcon = toSvg(body, width, height);
        const dataURIIcon = toDataURI(svgIcon);

        const paste = <Action.Paste title="Paste SVG" content={svgIcon} />;
        const copy = (
          <Action.CopyToClipboard title="Copy SVG" content={svgIcon} />
        );
        return (
          <Grid.Item
            content={{
              source: dataURIIcon,
              tintColor: body.includes('currentColor')
                ? Color.PrimaryText // Monochrome icon
                : null,
            }}
            key={`${setId}:${id}`}
            title={showName ? id : undefined}
            subtitle={showSet ? setName : undefined}
            actions={
              <ActionPanel>
                {primaryAction === 'paste' ? (
                  <>
                    {paste}
                    {copy}
                  </>
                ) : (
                  <>
                    {copy}
                    {paste}
                  </>
                )}
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
    </Grid>
  );
}

export default Command;
