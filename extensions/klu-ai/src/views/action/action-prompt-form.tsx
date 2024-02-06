import { useActionState } from "@/hooks/use-action";
import klu from "@/libs/klu";
import { Action, ActionPanel, Form, useNavigation } from "@raycast/api";
import { PropsWithChildren, useState } from "react";
import ActionDataList from "./action-data-list";

interface ActionPromptFormProps {
  guid: string;
  variables: string[];
  isLoading?: boolean;
  onSubmit: () => void;
}

const DefaultActionPrompt = (props: PropsWithChildren<Omit<ActionPromptFormProps, "variables">>) => {
  const [prompt, setPrompt] = useState<string>("");
  const [isLoading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>();

  const onChangePrompt = (value: string): void => {
    setPrompt(value);
    if (error && error.length > 0) {
      setError("");
    }
  };

  const onSubmitPrompt = async (): Promise<void> => {
    setLoading(true);
    await klu.actions.prompt(props.guid, prompt);
    setLoading(false);
    props.onSubmit();
  };

  const onBlurPrompt = (value: string): void => {
    value.length === 0 ? setError("This field shouldn't be empty") : setError(undefined);
    return;
  };

  return (
    <Form
      isLoading={props.isLoading || isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Submit" onSubmit={onSubmitPrompt} />
        </ActionPanel>
      }
    >
      {props.children}
      <Form.TextArea
        id="prompt"
        title="Prompt"
        autoFocus
        placeholder="Enter a prompt"
        error={error}
        onChange={onChangePrompt}
        onBlur={(e) => onBlurPrompt(e.target.value ?? "")}
      />
    </Form>
  );
};

const VariableActionPrompt = (props: PropsWithChildren<ActionPromptFormProps>) => {
  const [isLoading, setLoading] = useState<boolean>(false);
  const [data, setData] = useState<{ [key: string]: string }>(() =>
    props.variables.reduce((obj: { [key: string]: string }, key: string) => {
      obj[key] = "";
      return obj;
    }, {}),
  );

  const onSubmitPrompt = async (): Promise<void> => {
    setLoading(true);
    await klu.actions.prompt(props.guid, data);
    setLoading(false);
    props.onSubmit();
  };

  return (
    <Form
      isLoading={props.isLoading || isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Submit" onSubmit={onSubmitPrompt} />
        </ActionPanel>
      }
    >
      {props.children}
      {props.variables.map((variable, id) => {
        const [error, setError] = useState<string>();
        const onBlurPrompt = (value: string): void => {
          value.length === 0 ? setError("This field shouldn't be empty") : setError(undefined);
          return;
        };
        return (
          <Form.TextArea
            key={id}
            id={variable}
            title={variable.toUpperCase()}
            placeholder="Enter value"
            error={error}
            enableMarkdown
            onChange={(value) => {
              setData((prev) => ({ ...prev, [variable]: value }));
            }}
            onBlur={(e) => onBlurPrompt(e.target.value ?? "")}
          />
        );
      })}
    </Form>
  );
};

const ActionPromptForm = (props: PropsWithChildren<Omit<ActionPromptFormProps, "onSubmit">>) => {
  const { push } = useNavigation();
  const { setState } = useActionState(props.guid);

  const onSubmit = () => {
    push(<ActionDataList guid={props.guid} onChange={setState} />);
  };

  const newProps = { ...props, onSubmit };

  if (!props.variables || props.variables.length === 0) {
    return <DefaultActionPrompt {...newProps} />;
  }

  return <VariableActionPrompt {...newProps} />;
};

export default ActionPromptForm;
