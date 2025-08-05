import { ActionPanel, Grid, Action, Icon, showToast, Toast, showHUD } from '@raycast/api';
import { Bitmap } from '../../types/tokens.types';
import { copyImage } from '../../utils/assets.utils';

interface BitmapGridItemProps {
  bitmap: Bitmap;
  namespace: string;
  repositoryName: string;
}

export default ({ bitmap, namespace, repositoryName }: BitmapGridItemProps) => {
  const handleCopy = async () => {
    const toast = await showToast(Toast.Style.Animated, 'Getting your bitmap...');
    await copyImage(bitmap.value.url, bitmap.value.format);
    await toast.hide();
    await showHUD('Bitmap copied to clipboard');
  };

  return (
    <Grid.Item
      key={bitmap.id}
      title={bitmap.name}
      content={{ source: bitmap.value.url }}
      subtitle={`${bitmap.value.format.toUpperCase()} · @${bitmap.value.dimension || 1}x`}
      actions={
        <ActionPanel>
          <Action icon={Icon.Clipboard} title="Copy Bitmap" onAction={handleCopy} />
          <Action.OpenInBrowser
            title="Go to Repository"
            url={`https://specifyapp.com/${namespace}/${repositoryName}/bitmap`}
          />
        </ActionPanel>
      }
    />
  );
};
