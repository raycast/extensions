import {
  Action,
  ActionPanel,
  Color,
  Grid,
  getPreferenceValues,
  Icon as RaycastIcon,
  showToast,
  Toast,
  Clipboard,
} from '@raycast/api';
import { useState } from 'react';

import Service, { Icon } from './service';
import { toDataURI, toSvg, toURL, copyToClipboard } from './utils';
import { primaryActionEnum, iconColorEnum } from './types/perferenceValues';

const { primaryAction } = getPreferenceValues<{
  primaryAction: primaryActionEnum;
}>();

const { iconColor } = getPreferenceValues<{ iconColor: iconColorEnum }>();

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
      columns={8}
      inset={Grid.Inset.Medium}
      isLoading={isLoading}
      onSearchTextChange={queryIcons}
    >
      <Grid.EmptyView
        title="No results"
        description={getEmptyViewDescription(query, isLoading)}
      />
      {icons.map((icon) => {
        const { set, id, body, width, height } = icon;
        const { id: setId, title: setName } = set;
        const svgIcon = toSvg(body, width, height, iconColor);
        const dataURIIcon = toDataURI(svgIcon);

        const paste = (
          <Action.Paste title="Paste SVG String" content={svgIcon} />
        );
        const copy = (
          <Action.CopyToClipboard title="Copy SVG String" content={svgIcon} />
        );
        const pasteFile = (
          <Action
            title="Paste SVG File"
            icon={RaycastIcon.Clipboard}
            onAction={async () => {
              await copyToClipboard(svgIcon, id);
              const { file } = await Clipboard.read();
              if (file) {
                Clipboard.paste({ file: file.replace('file://', '') });
              }
            }}
          />
        );
        const copyFile = (
          <Action
            title="Copy SVG File"
            icon={RaycastIcon.Clipboard}
            onAction={async () => {
              await copyToClipboard(svgIcon, id);
              await showToast({
                title: 'Copied to clipboard',
                message: 'The SVG file has been copied to the clipboard.',
                style: Toast.Style.Success,
              });
            }}
          />
        );
        const pasteName = setId && (
          <Action.Paste title="Paste Name" content={`${setId}:${id}`} />
        );
        const copyName = (
          <Action.CopyToClipboard
            title="Copy Name"
            content={`${setId}:${id}`}
          />
        );
        const copyURL = (
          <Action.CopyToClipboard title="Copy URL" content={toURL(setId, id)} />
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
            title={id}
            subtitle={setName}
            actions={
              <ActionPanel>
                {primaryAction === primaryActionEnum.paste && (
                  <>
                    {paste}
                    {copy}
                    {pasteFile}
                    {copyFile}
                    {pasteName}
                    {copyName}
                    {copyURL}
                  </>
                )}
                {primaryAction === primaryActionEnum.copy && (
                  <>
                    {copy}
                    {paste}
                    {pasteFile}
                    {copyFile}
                    {pasteName}
                    {copyName}
                    {copyURL}
                  </>
                )}
                {primaryAction === primaryActionEnum.pasteName && (
                  <>
                    {pasteName}
                    {paste}
                    {copy}
                    {pasteFile}
                    {copyFile}
                    {copyName}
                    {copyURL}
                  </>
                )}
                {primaryAction === primaryActionEnum.pasteFile && (
                  <>
                    {pasteFile}
                    {paste}
                    {copy}
                    {copyFile}
                    {pasteName}
                    {copyName}
                    {copyURL}
                  </>
                )}
                {primaryAction === primaryActionEnum.copyFile && (
                  <>
                    {copyFile}
                    {paste}
                    {copy}
                    {pasteFile}
                    {pasteName}
                    {copyName}
                    {copyURL}
                  </>
                )}
                {primaryAction === primaryActionEnum.copyName && (
                  <>
                    {copyName}
                    {paste}
                    {copy}
                    {pasteFile}
                    {copyFile}
                    {pasteName}
                    {copyURL}
                  </>
                )}
                {primaryAction === primaryActionEnum.copyURL && (
                  <>
                    {copyURL}
                    {paste}
                    {copy}
                    {pasteFile}
                    {copyFile}
                    {pasteName}
                    {copyName}
                  </>
                )}
              </ActionPanel>
            }
          />
        );
      })}
    </Grid>
  );
}

export default Command;
