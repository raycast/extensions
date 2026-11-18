import {
  Action,
  ActionPanel,
  Detail,
  Form,
  getPreferenceValues,
  showToast,
  Toast,
} from '@raycast/api';
import noteActions from '../api/noteActions';
import { useCachedPromise, useForm } from '@raycast/utils';
import deckActions from '../api/deckActions';
import { useEffect, useRef, useState } from 'react';
import { CreateCardFormValues } from '../types';
import modelActions from '../api/modelActions';
import React from 'react';
import { isValidFileType, transformSubmittedData } from '../util';
import useErrorHandling from '../hooks/useErrorHandling';
import { mergeNoteTags } from '../helpers/noteTags';

type AddNoteFormValues = CreateCardFormValues & { newTags: string };

interface Props {
  deckName?: string;
}
export default function AddCardAction({ deckName }: Props) {
  const {
    data: decks,
    isLoading: decksLoading,
    error: decksError,
  } = useCachedPromise(deckActions.getDecks);
  const {
    data: models,
    isLoading: modelsLoading,
    error: modelsError,
  } = useCachedPromise(modelActions.getModels);
  const {
    data: tags,
    isLoading: tagsLoading,
    error: tagsError,
  } = useCachedPromise(noteActions.getTags);

  const { handleError, errorMarkdown } = useErrorHandling(decksError || modelsError || tagsError);
  const submitting = useRef(false);
  const latestValues = useRef<AddNoteFormValues | undefined>(undefined);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { allow_empty_card_fields } = getPreferenceValues<Preferences.AddCard>();

  const { handleSubmit, itemProps, values, reset, focus, setValidationError } =
    useForm<AddNoteFormValues>({
      initialValues: {
        deckName: deckName || '',
        modelName: '',
        tags: [],
        newTags: '',
      },
      onSubmit: async submittedValues => {
        if (submitting.current) return false;
        if (decksLoading || modelsLoading || tagsLoading || !decks || !models) {
          await showToast({ style: Toast.Style.Failure, title: 'Wait for Anki to finish loading' });
          return false;
        }
        if (!decks.some(deck => deck.name === submittedValues.deckName)) {
          setValidationError('deckName', 'Select a deck');
          return false;
        }
        const model = models.find(model => model.name === submittedValues.modelName);
        if (!model || !model.flds.length) {
          setValidationError('modelName', 'Select a note type with fields');
          return false;
        }
        const fieldNames = [...model.flds].sort((a, b) => a.ord - b.ord).map(field => field.name);
        for (const fieldName of fieldNames) {
          const invalidFiles = (submittedValues[`file_${fieldName}`] || []).filter(
            file => !isValidFileType(file)
          );
          if (invalidFiles.length) {
            setValidationError(
              `file_${fieldName}`,
              `Unsupported files: ${invalidFiles.join(', ')}`
            );
            return false;
          }
        }
        const firstField = fieldNames[0];
        if (
          !allow_empty_card_fields &&
          !submittedValues[`field_${firstField}`]?.trim() &&
          !submittedValues[`file_${firstField}`]?.length
        ) {
          setValidationError(
            `field_${firstField}`,
            'Enter text or attach a file to the first field'
          );
          return false;
        }

        submitting.current = true;
        setIsSubmitting(true);
        const submittedDraft = latestValues.current;
        try {
          await noteActions.addNote(
            transformSubmittedData(
              {
                ...submittedValues,
                tags: mergeNoteTags(submittedValues.tags, submittedValues.newTags),
              },
              fieldNames
            )
          );
          await showToast({
            style: Toast.Style.Success,
            title: `Added note to ${submittedValues.deckName}`,
          });
          if (latestValues.current === submittedDraft) {
            resetFields(submittedValues);
            focus(`field_${firstField}`);
          }
          return true;
        } catch (error) {
          handleError(error);
          return false;
        } finally {
          submitting.current = false;
          setIsSubmitting(false);
        }
      },
    });
  latestValues.current = values;

  function resetFields(
    selection: Pick<AddNoteFormValues, 'deckName' | 'modelName' | 'tags' | 'newTags'>
  ) {
    const model = models?.find(model => model.name === selection.modelName);
    reset({
      deckName: selection.deckName,
      modelName: selection.modelName,
      tags: selection.tags,
      newTags: selection.newTags,
      ...Object.fromEntries(
        (model?.flds || []).flatMap(field => [
          [`field_${field.name}`, ''],
          [`file_${field.name}`, []],
        ])
      ),
    });
  }

  useEffect(() => {
    const error = decksError || tagsError || modelsError;
    if (error) handleError(error);
  }, [decksError, tagsError, modelsError]);

  useEffect(() => {
    if (
      models &&
      !modelsLoading &&
      !modelsError &&
      values.modelName &&
      !models.some(model => model.name === values.modelName)
    ) {
      resetFields({ ...values, modelName: '' });
      setValidationError('modelName', 'This note type is unavailable. Select another note type.');
    }
  }, [models, modelsLoading, modelsError, values.modelName]);

  const selectedModel = models?.find(model => model.name === values.modelName);
  const fields = [...(selectedModel?.flds || [])].sort((a, b) => a.ord - b.ord);

  const handleClearForm = () => {
    if (submitting.current) return;
    resetFields(values);
    focus(fields.length ? `field_${fields[0].name}` : 'modelName');
  };

  return decksError || tagsError || modelsError ? (
    <Detail markdown={errorMarkdown} />
  ) : (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Add Note" onSubmit={handleSubmit} />
          <Action
            title="Clear Form"
            shortcut={{ modifiers: ['cmd'], key: 'x' }}
            onAction={handleClearForm}
          />
        </ActionPanel>
      }
      navigationTitle="Add Note"
      isLoading={decksLoading || modelsLoading || tagsLoading || isSubmitting}
    >
      <Form.Dropdown {...itemProps.deckName} title="Deck" storeValue isLoading={decksLoading}>
        <Form.Dropdown.Item title="Select a Deck" value="" />
        {decks?.map(deck => (
          <Form.Dropdown.Item key={deck.deck_id} title={deck.name} value={deck.name} />
        ))}
      </Form.Dropdown>

      <Form.Dropdown
        {...itemProps.modelName}
        title="Note Type"
        storeValue
        isLoading={modelsLoading}
        onChange={modelName => {
          if (modelName !== values.modelName) resetFields({ ...values, modelName });
        }}
      >
        <Form.Dropdown.Item title="Select a Note Type" value="" />
        {models?.map(model => (
          <Form.Dropdown.Item key={model.id} title={model.name} value={model.name} />
        ))}
      </Form.Dropdown>

      {fields.map((field, index) => (
        <React.Fragment key={field.name}>
          <Form.TextArea
            {...itemProps[`field_${field.name}`]}
            title={field.name}
            placeholder={field.description || `Enter ${field.name}`}
            info={
              index === 0
                ? 'The first field needs text or media. Anki validates the note type.'
                : 'Optional'
            }
          />
          <Form.FilePicker
            {...itemProps[`file_${field.name}`]}
            title={`${field.name} Files`}
            allowMultipleSelection
            onChange={files => {
              itemProps[`file_${field.name}`].onChange?.(files);
              const invalidFiles = files.filter(file => !isValidFileType(file));
              setValidationError(
                `file_${field.name}`,
                invalidFiles.length ? `Unsupported files: ${invalidFiles.join(', ')}` : undefined
              );
              if (files.length && !invalidFiles.length) {
                setValidationError(`field_${field.name}`, undefined);
              }
            }}
          />
        </React.Fragment>
      ))}

      <Form.TagPicker {...itemProps.tags} title="Tags">
        {tags?.map(tag => (
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
