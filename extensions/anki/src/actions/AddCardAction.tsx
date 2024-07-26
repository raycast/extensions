import { Action, ActionPanel, Form, showToast, Toast } from '@raycast/api';
import noteActions from '../api/noteActions';
import { useCachedPromise } from '@raycast/utils';
import deckActions from '../api/deckActions';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { CreateCardFormValues, ShortcutDictionary } from '../types';
import modelActions from '../api/modelActions';
import React from 'react';
import { transformSubmittedData } from '../util';
import { AnkiError } from '../error/AnkiError';

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

  // TODO: udpate this to also allow using different models
  const frontCardRef = useRef<Form.TextArea>(null);
  const backCardRef = useRef<Form.TextArea>(null);
  const tagsCardRef = useRef<Form.TextArea>(null);

  const shortcuts = useMemo((): ShortcutDictionary => {
    return {
      clearForm: { modifiers: ['cmd'], key: 'x' },
    };
  }, []);

  const [selectedModelName, setSelectedModelName] = useState<string>();
  const [selectedDeckName, setSelectedDeckName] = useState<string | undefined>(deckName);

  useEffect(() => {
    const error = decksError || tagsError || modelsError;
    if (error) {
      const isAnkiError = error instanceof AnkiError;
      showToast({
        title: isAnkiError ? 'Anki Error' : 'Error',
        message: isAnkiError ? error.message : 'Unknown error occured',
        style: Toast.Style.Failure,
      });
    }
  }, [decksError, tagsError, modelsError]);

  const handleClearForm = () => {
    frontCardRef.current?.reset();
    backCardRef.current?.reset();
    tagsCardRef.current?.reset();

    frontCardRef.current?.focus();
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
      if (error instanceof AnkiError) {
        showToast({
          title: error.action,
          message: error.message,
          style: Toast.Style.Failure,
        });
      } else if (error instanceof Error) {
        showToast({ title: error.message, style: Toast.Style.Failure });
      }

      return false;
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
        {flds.map(field => (
          <React.Fragment key={field.name}>
            <Form.TextArea
              id={`field_${field.name}`}
              title={field.name}
              placeholder={field.description || `Enter ${field.name}`}
              storeValue={false}
            />
            <Form.FilePicker
              id={`file_${field.name}`}
              title={`${field.name} files`}
              storeValue={false}
              allowMultipleSelection
            />
          </React.Fragment>
        ))}
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
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Add Card" onSubmit={handleAddCard} />
          <Action title="Clear Form" shortcut={shortcuts.clearForm} onAction={handleClearForm} />
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
      <Form.TagPicker id="tags" title="Tags" ref={tagsCardRef}>
        {tags?.map(tag => <Form.TagPicker.Item key={tag} value={tag} title={tag} />)}
      </Form.TagPicker>

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
    </Form>
  );
}
