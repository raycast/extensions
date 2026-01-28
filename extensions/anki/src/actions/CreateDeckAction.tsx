import { Form, ActionPanel, Action, showToast, useNavigation, Toast } from '@raycast/api';
import deckActions from '../api/deckActions';
import useErrorHandling from '../hooks/useErrorHandling';

const CreateDeckAction = () => {
  const { pop } = useNavigation();
  const { handleError } = useErrorHandling();

  const handleSubmit = async (values: { deckName: string }) => {
    try {
      await deckActions.createDeck(values.deckName);

      await showToast({
        style: Toast.Style.Success,
        title: 'Created deck',
        message: values.deckName,
      });
    } catch (err) {
      handleError(err);
    }
    pop();
  };

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Create Deck" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField id="deckName" title="Deck Name" />
    </Form>
  );
};
export default CreateDeckAction;
