import { Todo } from './todo';
import { Action, ActionPanel, Form, useNavigation } from '@raycast/api';
import { randomUUID } from 'crypto';
import { useState } from 'react';

/*
 * todo: rename, form is not only used for creating
 */

export function TodoForm(props: {
  onCreate: (todo: Todo) => void;
  defaultTitle?: string;
  topPriority?: boolean;
  todo?: Todo;
}) {
  const { pop } = useNavigation();

  const [titleError, setTitleError] = useState<string | undefined>();

  function OnTitleValidate(event: Form.Event<string>) {
    if (event.target.value?.length === 0) {
      setTitleError('Non empty title not allowed');
    } else {
      setTitleError(undefined);
    }
  }

  function handleSubmit(values: {
    title: string;
    urgent: boolean;
    important: boolean;
    quick: boolean;
  }) {
    props.onCreate({
      title: values.title,
      isCompleted: false,
      urgent: values.urgent,
      important: values.important,
      quick: values.quick,
      id: props.todo?.id || randomUUID(), // maybe this is not necessary, depending on how we handle update
    });
    pop();
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title={props.todo ? 'Edit To-do' : 'Create To-do'}
            onSubmit={handleSubmit}
          />
        </ActionPanel>
      }
    >
      <Form.TextField
        id='title'
        title='Title'
        defaultValue={props.defaultTitle || props.todo?.title}
        error={titleError}
        onBlur={OnTitleValidate}
        onChange={() => (titleError ? setTitleError(undefined) : undefined)}
      />
      <Form.Checkbox
        id='urgent'
        label='Urgent'
        defaultValue={props.topPriority || props.todo?.urgent}
      />
      <Form.Checkbox
        id='important'
        label='Important'
        defaultValue={props.topPriority || props.todo?.important}
      />
      <Form.Checkbox
        id='quick'
        label='Quick'
        defaultValue={props.topPriority || props.todo?.quick}
      />
    </Form>
  );
}
