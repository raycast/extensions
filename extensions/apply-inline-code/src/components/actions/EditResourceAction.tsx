import { Action, Icon } from '@raycast/api';
import ResourceForm from '../forms/ResourceForm';
import { Resource } from '../../types/resource';

interface EditResourceActionProps {
  defaultValues: Partial<Resource>;
  onEdit: (resource: Resource) => void;
}

const EditResourceAction: React.FC<EditResourceActionProps> = ({ defaultValues, onEdit }) => {
  return (
    <Action.Push
      icon={Icon.Pencil}
      title="Edit Resource"
      shortcut={{ modifiers: ['cmd'], key: 'e' }}
      target={<ResourceForm defaultValues={defaultValues} handleSubmit={onEdit} />}
    />
  );
};

export default EditResourceAction;
