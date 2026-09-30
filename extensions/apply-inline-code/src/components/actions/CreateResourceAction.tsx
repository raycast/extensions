import { Action, Icon } from '@raycast/api';
import ResourceForm from '../forms/ResourceForm';
import { Resource } from '../../types/resource';

interface CreateResourceActionProps {
  onCreate: (resource: Resource) => void;
  defaultValues?: Partial<Resource>;
}

const CreateResourceAction = ({ onCreate, defaultValues }: CreateResourceActionProps) => {
  return (
    <Action.Push
      icon={Icon.Plus}
      title="Add Resource"
      shortcut={{ modifiers: ['cmd'], key: 'n' }}
      target={
        <ResourceForm
          handleSubmit={val => onCreate(val as Resource)}
          defaultValues={defaultValues}
        />
      }
    />
  );
};

export default CreateResourceAction;
