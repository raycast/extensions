import { FC } from 'react';
import { ActionPanel, Action, List } from '@raycast/api';
import InstallAction from '../actions/install';

import { NodeVersionGrouped } from '../../types';
import UninstallAction from '../actions/uninstall';
import MakeDefaultAction from '../actions/makeDefault';
import OpenDocumentationAction from '../actions/documentation';

interface Props {
  versionManagerName: string;
  versions: NodeVersionGrouped;
  isLoading: boolean;
  isInstallView?: boolean;
  showCustomAction?: boolean;
  onUpdateList?: () => void;
}

const ListView: FC<Props> = ({
  versionManagerName,
  versions,
  isLoading,
  onUpdateList,
  isInstallView = false,
  showCustomAction = true,
}) => {
  return (
    <List isLoading={isLoading} isShowingDetail>
      <List.EmptyView
        icon={{ source: './nodedotjs.svg', tintColor: '#339933' }}
        title={'No installed node versions'}
        description={`Use ${versionManagerName} install command or ${versionManagerName} install [version] to install node versions`}
      />
      {Object.keys(versions).map((group) => (
        <List.Section title={group} key={group}>
          {versions[group].map((version) => (
            <List.Item
              key={version.title}
              title={version.title}
              detail={
                <List.Item.Detail
                  metadata={
                    <List.Item.Detail.Metadata>
                      <List.Item.Detail.Metadata.TagList title="Type">
                        <List.Item.Detail.Metadata.TagList.Item text={version.type!} />
                        <List.Item.Detail.Metadata.TagList.Item text={version.group!} />
                      </List.Item.Detail.Metadata.TagList>
                      <List.Item.Detail.Metadata.Separator />
                      <List.Item.Detail.Metadata.Link
                        title="Documentation"
                        target={`https://nodejs.org/docs/${version.title}/api/`}
                        text="Documentation"
                      />
                    </List.Item.Detail.Metadata>
                  }
                />
              }
              icon={{ source: './nodedotjs.svg', tintColor: '#339933' }}
              actions={
                <ActionPanel>
                  {showCustomAction ? (
                    isInstallView ? (
                      <InstallAction version={version.title} onUpdateList={onUpdateList} />
                    ) : (
                      <>
                        <MakeDefaultAction version={version.title} onUpdateList={onUpdateList!} />
                        <UninstallAction version={version.title} onUpdateList={onUpdateList!} />
                      </>
                    )
                  ) : null}
                  <Action.CopyToClipboard content={version.title} />
                  <OpenDocumentationAction version={version.title} />
                </ActionPanel>
              }
            />
          ))}
        </List.Section>
      ))}
    </List>
  );
};

export default ListView;
