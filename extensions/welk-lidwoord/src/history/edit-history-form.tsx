import { Action, ActionPanel, Form, showToast, Toast, useNavigation } from '@raycast/api';
import { useState } from 'react';
import type { HistoryFormValues, HistoryItem } from './types';

type Props = {
  item: HistoryItem;
  onUpdate: (id: number, values: HistoryFormValues) => Promise<void>;
};

export function EditHistoryForm({ item, onUpdate }: Props) {
  const [isLoading, setIsLoading] = useState(false);
  const { pop } = useNavigation();

  const handleSubmit = async (values: HistoryFormValues) => {
    if (!values.word.trim()) {
      await showToast({
        style: Toast.Style.Failure,
        title: 'Word is required',
      });
      return;
    }

    setIsLoading(true);

    try {
      await onUpdate(item.id, values);
      await showToast({
        style: Toast.Style.Success,
        title: 'History entry updated',
      });
      pop();
    } catch {
      await showToast({
        style: Toast.Style.Failure,
        title: 'Could not update history entry',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Form
      isLoading={isLoading}
      navigationTitle="Edit History Entry"
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Save History Entry" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField id="word" title="Word" defaultValue={item.word} />
      <Form.TextField id="result" title="Article" defaultValue={item.result ?? ''} />
    </Form>
  );
}
