import { Action, ActionPanel, Form, showToast, Toast } from '@raycast/api';
import { useState } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { Model, ModelHook } from '../../type';

export const ModelForm = (props: { model?: Model; use: { models: ModelHook }; name?: string }) => {
  const { use } = props;

  const [data, setData] = useState<Model>(
    props?.model ?? {
      id: uuidv4(),
      updated_at: '',
      created_at: new Date().toISOString(),
      name: props?.name ?? '',
      prompt: '',
      option: 'gpt-3.5-turbo',
      temperature: 1,
      pinned: false,
    }
  );

  const [error, setError] = useState<{ name: string; prompt: string; option: string; temperature: string }>({
    name: '',
    prompt: '',
    option: '',
    temperature: '',
  });

  const onSubmit = async (model: Model) => {
    let updatedModel: Model = { ...model, updated_at: new Date().toISOString() };
    if (typeof updatedModel.temperature === 'string') {
      const toast = await showToast({
        title: 'Update your model...',
        style: Toast.Style.Animated,
      });
      updatedModel = { ...updatedModel, temperature: Number(updatedModel.temperature) };
      toast.title = 'Model updated!';
      toast.style = Toast.Style.Success;
    }
    if (props.model) {
      use.models.update({ ...updatedModel, id: props.model.id, created_at: props.model.created_at });
    } else {
      use.models.add({ ...updatedModel, id: data.id, created_at: data.created_at });
    }
  };

  const MODEL_OPTIONS = use.models.option;

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Submit" onSubmit={onSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="name"
        title="Name"
        placeholder="Name your model"
        defaultValue={data.name}
        error={error.name.length > 0 ? error.name : undefined}
        onChange={(value) => setData({ ...data, name: value })}
        onBlur={(event) => {
          if (event.target.value?.length == 0) {
            setError({ ...error, name: 'Required' });
          } else {
            if (error.name && error.name.length > 0) {
              setError({ ...error, name: '' });
            }
          }
        }}
      />
      <Form.TextArea
        id="prompt"
        title="Prompt"
        placeholder="Describe your prompt"
        defaultValue={data.prompt}
        error={error.prompt.length > 0 ? error.prompt : undefined}
        onChange={(value) => setData({ ...data, prompt: value })}
        onBlur={(event) => {
          if (event.target.value?.length == 0) {
            setError({ ...error, prompt: 'Required' });
          } else {
            if (error.prompt && error.prompt.length > 0) {
              setError({ ...error, prompt: '' });
            }
          }
        }}
      />
      <Form.TextField
        id="temperature"
        title="Temperature"
        placeholder="Set your sampling temperature (0 - 2)"
        defaultValue={data.temperature.toLocaleString()}
        error={error.temperature.length > 0 ? error.temperature : undefined}
        onChange={(value) => {
          setData({ ...data, temperature: Number(value) });
        }}
        onBlur={(event) => {
          if (event.target.value?.length == 0) {
            setError({ ...error, temperature: 'Required' });
          } else {
            if (Number(event.target.value ?? 0) < 0) {
              setError({ ...error, temperature: 'Minimal value is 0' });
            } else if (Number(event.target.value ?? 0) > 2) {
              setError({ ...error, temperature: 'Maximal value is 2' });
            } else {
              if (error.temperature && error.temperature.length > 0) {
                setError({ ...error, temperature: '' });
              }
            }
          }
        }}
      />
      <Form.Dropdown
        id="option"
        title="Model"
        placeholder="Choose model option"
        defaultValue={data.option}
        onChange={(value) => setData({ ...data, option: value, updated_at: new Date().toISOString() })}
      >
        {MODEL_OPTIONS.map((option) => (
          <Form.Dropdown.Item value={option} title={option} key={option} />
        ))}
      </Form.Dropdown>
      {data.id !== 'default' && (
        <Form.Checkbox
          id="pinned"
          title="Pinned"
          label="Pin model"
          defaultValue={data.pinned}
          onChange={(value) => setData({ ...data, pinned: value })}
        />
      )}
    </Form>
  );
};
