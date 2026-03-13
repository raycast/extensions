import { Action, Icon, List } from '@raycast/api';
import { DocumentationDetail } from './DocumentationDetail';

import type { RamdaFunction } from '../@types';
import { CommonActionPanel } from './CommonActionPanel';

export const SearchListItem = ({ searchResult }: { searchResult: RamdaFunction }) => (
  <List.Item
    title={searchResult.functionName}
    subtitle={searchResult.description}
    actions={
      <CommonActionPanel data={searchResult}>
        <Action.Push icon={Icon.AppWindow} title="Show Details" target={<DocumentationDetail data={searchResult} />} />
      </CommonActionPanel>
    }
  />
);
