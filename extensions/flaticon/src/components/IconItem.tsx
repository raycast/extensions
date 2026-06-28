import { Action, ActionPanel, Grid, Icon } from '@raycast/api';
import copyFileToClipboard from '../functions/copyFileToClipboard';
import { FlatIcon } from '../entities/FlatIcon';

type Props = {
  icon: FlatIcon;
};

export default ({
  icon: {
    id,
    sizes: { _512 },
    description,
    tags,
  },
}: Props) => (
  <Grid.Item
    key={id}
    content={_512}
    subtitle={description}
    keywords={tags}
    actions={
      <ActionPanel>
        <Action
          title="Copy to Clipboard"
          icon={Icon.Clipboard}
          shortcut={{ modifiers: ['cmd'], key: 'c' }}
          onAction={() => copyFileToClipboard({ url: _512 })}
        />
        <Action.OpenInBrowser url={_512} title="Open in Browser" />
        <Action.OpenInBrowser url={`https://www.flaticon.com/free-icon/whatever_${id}`} title="Open Icon Page" />
      </ActionPanel>
    }
  />
);
