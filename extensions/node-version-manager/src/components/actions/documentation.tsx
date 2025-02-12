import { FC } from 'react';
import { Action } from '@raycast/api';

interface Props {
  version: string;
}

const OpenDocumentationAction: FC<Props> = ({ version }) => {
  return (
    <Action.OpenInBrowser
      title="Open Documentation"
      url={`https://nodejs.org/docs/${version}/api/`}
      shortcut={{ modifiers: ['cmd'], key: 'd' }}
    />
  );
};

export default OpenDocumentationAction;
