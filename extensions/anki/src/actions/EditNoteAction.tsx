import { Action, ActionPanel, Detail, Form, showToast, Toast, useNavigation } from '@raycast/api';
import { useCachedPromise, useForm, usePromise } from '@raycast/utils';
import { useRef, useState } from 'react';
import noteActions from '../api/noteActions';
import useErrorHandling from '../hooks/useErrorHandling';
import { mergeNoteTags } from '../helpers/noteTags';
import { Note } from '../types';

type EditNoteValues = { [key: `field_${string}`]: string } & { tags: string[]; newTags: string };

export default function EditNoteAction({ noteId }: { noteId: number }) {
  const { data, error, isLoading } = usePromise(noteActions.notesInfo, [noteId]);
  const { errorMarkdown } = useErrorHandling(error);
  if (error) return <Detail markdown={errorMarkdown} />;
  const note = data?.find(note => note.noteId === noteId);
  if (!note) {
    return (
      <Detail
        isLoading={isLoading}
        markdown={isLoading ? '' : '# Note Not Found\n\nThis note may have been deleted in Anki.'}
      />
    );
  }
  return <EditNoteForm key={note.noteId} note={note} />;
}

export function EditNoteForm({ note }: { note: Note }) {
  const { pop } = useNavigation();
  const { handleError } = useErrorHandling();
  const { data: tags } = useCachedPromise(noteActions.getTags);
  const submitting = useRef(false);
  const savedFields = useRef(
    Object.fromEntries(Object.entries(note.fields).map(([name, field]) => [name, field.value]))
  );
  const savedTags = useRef(note.tags);
  const latestValues = useRef<EditNoteValues | undefined>(undefined);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const fields = Object.entries(note.fields).sort(([, a], [, b]) => a.order - b.order);
  const { handleSubmit, itemProps, values } = useForm<EditNoteValues>({
    initialValues: {
      ...Object.fromEntries(fields.map(([name, field]) => [`field_${name}`, field.value])),
      tags: note.tags,
      newTags: '',
    },
    onSubmit: async submittedValues => {
      if (submitting.current) return false;
      submitting.current = true;
      setIsSubmitting(true);
      const submittedDraft = latestValues.current;
      try {
        const fieldsToSave = Object.fromEntries(
          fields.map(([name]) => [name, submittedValues[`field_${name}`]])
        );
        const tagsToSave = mergeNoteTags(submittedValues.tags, submittedValues.newTags);
        const changedFields = Object.fromEntries(
          Object.entries(fieldsToSave).filter(
            ([name, value]) => value !== savedFields.current[name]
          )
        );
        const tagsChanged =
          [...tagsToSave].sort().join(' ') !== [...savedTags.current].sort().join(' ');
        if (Object.keys(changedFields).length || tagsChanged) {
          if (Object.keys(changedFields).length) {
            await noteActions.updateNote({
              id: note.noteId,
              fields: changedFields,
              ...(tagsChanged ? { tags: tagsToSave } : {}),
            });
          } else {
            await noteActions.updateNote({ id: note.noteId, tags: tagsToSave });
          }
          savedFields.current = fieldsToSave;
          savedTags.current = tagsToSave;
        }
        await showToast({ style: Toast.Style.Success, title: 'Updated Note' });
        if (latestValues.current === submittedDraft) pop();
        return true;
      } catch (error) {
        await handleError(error);
        return false;
      } finally {
        submitting.current = false;
        setIsSubmitting(false);
      }
    },
  });
  latestValues.current = values;

  return (
    <Form
      navigationTitle="Edit Note"
      isLoading={isSubmitting}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Save Note" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.Description title="Note Type" text={note.modelName} />
      {fields.map(([name]) => (
        <Form.TextArea
          key={name}
          {...itemProps[`field_${name}`]}
          title={name}
          info="Fields contain Anki HTML. Keep existing image and sound markup to preserve media."
        />
      ))}
      <Form.TagPicker {...itemProps.tags} title="Tags">
        {[...new Set([...note.tags, ...(tags || []), ...values.tags])].sort().map(tag => (
          <Form.TagPicker.Item key={tag} value={tag} title={tag} />
        ))}
      </Form.TagPicker>
      <Form.TextField
        {...itemProps.newTags}
        title="New Tags"
        placeholder="biology chapter::one"
        info="Separate tags with spaces. Use :: for nested tags."
      />
    </Form>
  );
}
