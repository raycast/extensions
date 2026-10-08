import { FC } from 'react';
import { List } from '@raycast/api';

interface Props {
  versionManagerName: string;
}

const EmptyView: FC<Props> = ({ versionManagerName }) => {
  return (
    <List>
      <List.EmptyView
        icon={{ source: './nodedotjs.svg', tintColor: '#339933' }}
        title={`${versionManagerName} is not installed`}
        description={`Use brew install ${versionManagerName} to install ${versionManagerName}`}
      />
    </List>
  );
};

export default EmptyView;
