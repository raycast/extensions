import { ActionPanel, List } from '@raycast/api';
import CreateResourceAction from './actions/CreateResourceAction';
import { Resource } from '../types/resource';

interface IProps {
  filter: string;
  searchText: string;
  onCreate: (resource: Resource) => void;
}

const EmptyView = ({ filter, searchText, onCreate }: IProps) => {
  return (
    <List.EmptyView
      title="No matching resource found"
      description={`Can't find a resource matching "${searchText}"${filter ? ` and filter is "${filter}"` : ''}.\nCreate it now!`}
      actions={
        <ActionPanel>
          <CreateResourceAction
            defaultValues={{
              name: searchText,
              type: (['website', 'application'].includes(filter)
                ? filter
                : 'website') as Resource['type'],
            }}
            onCreate={onCreate}
          />
        </ActionPanel>
      }
    />
  );
};
export default EmptyView;
