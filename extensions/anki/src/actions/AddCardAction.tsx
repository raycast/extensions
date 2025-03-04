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
import { useEffect, useMemo, useRef } from 'react';
import { CreateCardFormValues, FieldRef, ShortcutDictionary } from '../types';
import modelActions from '../api/modelActions';
import React from 'react';
import { isValidFileType, transformSubmittedData } from '../util';
import useErrorHandling from '../hooks/useErrorHandling';

interface Props {
  deckName?: string;
}
export default function AddCardAction({ deckName }: Props) {
  const { handleError, errorMarkdown } = useErrorHandling();

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

  const tagsCardRef = useRef<Form.TagPicker>(null);
  const fieldRefs = useRef<Record<string, FieldRef>>({});

  const shortcuts = useMemo((): ShortcutDictionary => {
    return {
      clearForm: { modifiers: ['cmd'], key: 'x' },
    };
  }, []);

  const { allow_empty_card_fields } = getPreferenceValues<Preferences.AddCard>();

  const { handleSubmit, itemProps, values, reset, focus, setValidationError } =
    useForm<CreateCardFormValues>({
      initialValues: {
        deckName: deckName,
        modelName: '',
        tags: [],
      },
      onSubmit: async values => {
        if (!models || modelsLoading || modelsError) return;
        try {
          const fieldNames = models
            .find(model => values.modelName === model.name)!
            .flds.map(fld => fld.name);

          const createCardRequestBody = transformSubmittedData(values, fieldNames);

          // Validate card fields
          if (!allow_empty_card_fields) {
            for (const fieldName of fieldNames) {
              const fieldValue = values[`field_${fieldName}`];
              if (!fieldValue || (typeof fieldValue === 'string' && fieldValue.trim() === '')) {
                setValidationError(`field_${fieldName}`, `${fieldName} is required`);
                return;
              }
            }
          }

          await noteActions.addNote(createCardRequestBody);

          showToast({
            style: Toast.Style.Success,
            title: `Added new card to deck: ${values.deckName}`,
          });

          handleClearForm();

          return true;
        } catch (error) {
          handleError(error);
        }
      },
    });

  useEffect(() => {
    const error = decksError || tagsError || modelsError;
    if (!error) return;
    handleError(error);
  }, [decksError, tagsError, modelsError]);

  const handleClearForm = () => {
    reset();
    tagsCardRef.current?.reset();
    Object.values(fieldRefs.current).forEach(ref => {
      if (ref.current && ref.current.reset) {
        ref.current.reset();
      }
    });

    // Focus on the first field
    focus('deckName');
  };

  const handleFileChange = (fieldName: string, files: string[]) => {
    const invalidFiles = files.filter(file => !isValidFileType(file));
    if (invalidFiles.length > 0) {
      setValidationError(
        `file_${fieldName}`,
        `Invalid file type(s) selected: ${invalidFiles.join(', ')}`
      );
    } else {
      setValidationError(`file_${fieldName}`, undefined);
    }
  };

  const fields = useMemo(() => {
    if (modelsLoading || modelsError || !models || !values.modelName) return null;

    const selectedModel = models.find(model => model.name === values.modelName);

    if (!selectedModel) {
      throw new Error(`Model "${values.modelName}" not found`);
    }

    const { flds } = selectedModel;

    return (
      <>
        {flds.map(field => {
          const textAreaRef = React.createRef<Form.TextArea>();
          const filePickerRef = React.createRef<Form.FilePicker>();
          fieldRefs.current[`field_${field.name}`] = textAreaRef;
          fieldRefs.current[`file_${field.name}`] = filePickerRef;

          return (
            <React.Fragment key={field.name}>
              <Form.TextArea
                {...itemProps[`field_${field.name}`]}
                title={field.name}
                placeholder={field.description || `Enter ${field.name}`}
                ref={textAreaRef}
              />
              <Form.FilePicker
                {...itemProps[`file_${field.name}`]}
                title={`${field.name} files`}
                allowMultipleSelection
                onChange={files => handleFileChange(field.name, files)}
                ref={filePickerRef}
              />
            </React.Fragment>
          );
        })}
      </>
    );
  }, [models, modelsLoading, modelsError, values.modelName, itemProps]);

  return (
    <>
      {decksError || tagsError || modelsError ? (
        <Detail markdown={errorMarkdown} />
      ) : (
        <Form
          actions={
            <ActionPanel>
              <Action.SubmitForm title="Add Card" onSubmit={handleSubmit} />
              <Action
                title="Clear Form"
                shortcut={shortcuts.clearForm}
                onAction={handleClearForm}
              />
            </ActionPanel>
          }
          navigationTitle="Add Card"
          isLoading={decksLoading || modelsLoading || tagsLoading}
        >
          <Form.Dropdown
            {...itemProps.deckName}
            title="Deck"
            storeValue={true}
            isLoading={decksLoading}
          >
            {decks?.map(deck => (
              <Form.Dropdown.Item key={deck.deck_id} title={deck.name} value={deck.name} />
            ))}
          </Form.Dropdown>

          <Form.Dropdown
            {...itemProps.modelName}
            title="Model"
            storeValue={true}
            isLoading={modelsLoading}
          >
            {models?.map(model => (
              <Form.Dropdown.Item key={model.id} title={model.name} value={model.name} />
            ))}
          </Form.Dropdown>

          {fields}

          <Form.TagPicker {...itemProps.tags} title="Tags" ref={tagsCardRef}>
            {tags?.map(tag => <Form.TagPicker.Item key={tag} value={tag} title={tag} />)}
          </Form.TagPicker>
        </Form>
      )}
    </>
  );
}
