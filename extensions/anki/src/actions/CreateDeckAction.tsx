import { Form, ActionPanel, Action, showToast, useNavigation, Toast } from '@raycast/api';
import { useRef, useState } from 'react';
import deckActions from '../api/deckActions';
import useErrorHandling from '../hooks/useErrorHandling';

const CreateDeckAction = () => {
  const { pop } = useNavigation();
  const { handleError } = useErrorHandling();
  const [nameError, setNameError] = useState<string>();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const submitting = useRef(false);

  const handleSubmit = async (values: { deckName: string }) => {
    if (submitting.current) return;
    const deckName = values.deckName.trim();
    if (!deckName) {
      setNameError('Enter a deck name');
      return;
    }

    submitting.current = true;
    setIsSubmitting(true);
    try {
      await deckActions.createDeck(deckName);
      await showToast({
        style: Toast.Style.Success,
        title: 'Created deck',
        message: deckName,
      });
      pop();
    } catch (err) {
      handleError(err);
    } finally {
      submitting.current = false;
      setIsSubmitting(false);
    }
  };

  return (
    <Form
      isLoading={isSubmitting}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Create Deck" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="deckName"
        title="Deck Name"
        error={nameError}
        onChange={() => setNameError(undefined)}
      />
    </Form>
  );
};
export default CreateDeckAction;
