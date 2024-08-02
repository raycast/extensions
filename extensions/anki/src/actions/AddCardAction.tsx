import { Action, ActionPanel, Detail, Form, showToast } from '@raycast/api';
import noteActions from '../api/noteActions';
import { useCachedPromise } from '@raycast/utils';
import deckActions from '../api/deckActions';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { CreateCardFormValues, FieldRef, ShortcutDictionary } from '../types';
import modelActions from '../api/modelActions';
import React from 'react';
import { transformSubmittedData } from '../util';
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

  const tagsCardRef = useRef<Form.TextArea>(null);
  const fieldRefs = useRef<Record<string, FieldRef>>({});

  const shortcuts = useMemo((): ShortcutDictionary => {
    return {
      clearForm: { modifiers: ['cmd'], key: 'x' },
    };
  }, []);

  const [selectedModelName, setSelectedModelName] = useState<string>();
  const [selectedDeckName, setSelectedDeckName] = useState<string | undefined>(deckName);

  useEffect(() => {
    const error = decksError || tagsError || modelsError;
    if (!error) return;
    handleError(error);
  }, [decksError, tagsError, modelsError]);

  const handleClearForm = () => {
    tagsCardRef.current?.reset();
    Object.values(fieldRefs.current).forEach(ref => {
      if (ref.current && ref.current.reset) {
        ref.current.reset();
      }
    });

    // Focus on the first field
    const firstFieldRef = Object.values(fieldRefs.current)[0];
    if (firstFieldRef && firstFieldRef.current) {
      firstFieldRef.current.focus();
    }
  };

  const handleDeckChange = useCallback(
    (deckName: string) => {
      setSelectedDeckName(deckName);
    },
    [selectedDeckName]
  );

  const handleAddCard = async (values: CreateCardFormValues) => {
    if (!models || modelsLoading || modelsError) return;
    try {
      const fieldNames = models
        .find(model => selectedModelName === model.name)!
        .flds.map(fld => fld.name);

      const createCardRequestBody = transformSubmittedData(values, fieldNames);

      await noteActions.addNote(createCardRequestBody);

      showToast({
        title: `Added new card to deck: ${values.deckName}`,
      });

      handleClearForm();

      return true;
    } catch (error) {
      handleError(error);
    }
  };

  const fields = useMemo(() => {
    if (modelsLoading || modelsError || !models) return;
    if (!selectedModelName) return;

    const selectedModel = models.find(model => model.name === selectedModelName);

    if (!selectedModel) {
      throw new Error(`Model "${selectedModelName}" not found`);
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
                id={`field_${field.name}`}
                title={field.name}
                placeholder={field.description || `Enter ${field.name}`}
                storeValue={false}
                ref={textAreaRef}
              />
              <Form.FilePicker
                id={`file_${field.name}`}
                title={`${field.name} files`}
                storeValue={false}
                allowMultipleSelection
                ref={filePickerRef}
              />
            </React.Fragment>
          );
        })}
      </>
    );
  }, [models, modelsLoading, modelsError, selectedModelName]);

  const handleModelChange = useCallback(
    (value: string) => {
      setSelectedModelName(value);
    },
    [setSelectedModelName, selectedModelName]
  );

  return (
    <>
      {decksError || tagsError || modelsError ? (
        <Detail markdown={errorMarkdown} />
      ) : (
        <Form
          actions={
            <ActionPanel>
              <Action.SubmitForm title="Add Card" onSubmit={handleAddCard} />
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
            id="deckName"
            title="Deck"
            isLoading={decksLoading}
            storeValue={true}
            onChange={handleDeckChange}
            value={selectedDeckName}
          >
            {decks?.map(deck => (
              <Form.Dropdown.Item key={deck.deck_id} title={deck.name} value={deck.name} />
            ))}
          </Form.Dropdown>

          <Form.Dropdown
            id="modelName"
            title="Model"
            isLoading={modelsLoading}
            onChange={handleModelChange}
            storeValue={true}
          >
            {models?.map(model => (
              <Form.Dropdown.Item key={model.id} title={model.name} value={model.name} />
            ))}
          </Form.Dropdown>

          {fields}

          <Form.TagPicker id="tags" title="Tags" ref={tagsCardRef}>
            {tags?.map(tag => <Form.TagPicker.Item key={tag} value={tag} title={tag} />)}
          </Form.TagPicker>
        </Form>
      )}
    </>
  );
}
