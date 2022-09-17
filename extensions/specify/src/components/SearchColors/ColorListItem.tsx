import { ActionPanel, List, Action, Icon } from '@raycast/api';
import tinycolor from 'tinycolor2';
import { Color } from '../../types/tokens.types';

interface ColorListItemProps {
  color: Color;
  namespace: string;
  repositoryName: string;
}

export default ({ color, namespace, repositoryName }: ColorListItemProps) => {
  const colorInstance = tinycolor(color.value);

  return (
    <List.Item
      icon={{
        // NOTE: It is not possible currently to add a tintColor to a SVG
        // There is no full circle icon either in Raycast default icons.
        // Instead, we use a png with the right shape that will be filled with the right color.
        source: 'color-placeholder.png',
        tintColor: colorInstance.toRgbString(),
      }}
      key={color.id}
      title={color.name}
      accessories={[{ text: colorInstance.toHexString() }]}
      actions={
        <ActionPanel>
          <Action.CopyToClipboard title="Copy HEX" content={colorInstance.toHexString()} />
          <Action.CopyToClipboard title="Copy RGBA" content={colorInstance.toRgbString()} />
          <Action.CopyToClipboard title="Copy HSL" content={colorInstance.toHslString()} />
          <Action.CopyToClipboard title="Copy Token Name" icon={Icon.Text} content={color.name} />
          <Action.OpenInBrowser
            title="Go to Repository"
            url={`https://specifyapp.com/${namespace}/${repositoryName}/color`}
          />
        </ActionPanel>
      }
    />
  );
};
