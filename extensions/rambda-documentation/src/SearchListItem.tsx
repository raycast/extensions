import { Action, List } from '@raycast/api';
import { DocumentationDetail } from './DocumentationDetail';

import type { RambdaFunction } from '../@types';
import { CommonActionPanel } from './CommonActionPanel';

export const SearchListItem = ({ searchResult }: { searchResult: RambdaFunction }) => (
  <List.Item
    title={searchResult.functionName}
    subtitle={searchResult.description}
    actions={
      <CommonActionPanel data={searchResult}>
        <Action.Push title={searchResult.functionName} target={<DocumentationDetail data={searchResult} />} />
      </CommonActionPanel>
    }
  />
);
