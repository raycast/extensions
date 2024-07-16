import * as Types from "./../types";
import * as React from "react";
import { Action, ActionPanel, Form, Icon } from "@raycast/api";
import { FormValidation, useForm } from "@raycast/utils";
import { GetServerClassByName, PullModel } from "./../function";

interface props {
  setShow: React.Dispatch<React.SetStateAction<boolean>>;
  setDownload: React.Dispatch<React.SetStateAction<Types.UiModelDownload[]>>;
  revalidate: CallableFunction;
  servers: string[];
  selectedServer: string;
}

interface FormData {
  server: string;
  model: string;
}

export function FormPullModel(props: props): JSX.Element {
  const [isLoading, setIsLoading]: [boolean, React.Dispatch<React.SetStateAction<boolean>>] = React.useState(false);
  const { handleSubmit, itemProps } = useForm<FormData>({
    onSubmit(values) {
      Submit(values);
    },
    initialValues: {
      server: props.selectedServer !== "All" ? props.selectedServer : "Local",
    },
    validation: {
      server: FormValidation.Required,
      model: FormValidation.Required,
    },
  });

  async function Submit(values: FormData) {
    setIsLoading(true);
    const o = await GetServerClassByName(values.server);
    await PullModel(o, values.server, values.model, props.setDownload, props.revalidate);
    props.setShow(false);
    setIsLoading(false);
  }

  const InfoServer = "Ollama Server Name";
  const InfoModel = "Model Tag";

  const ActionView = (
    <ActionPanel>
      {!isLoading && <Action.SubmitForm onSubmit={handleSubmit} />}
      {!isLoading && <Action title="Close" icon={Icon.Xmark} onAction={() => props.setShow(false)} />}
    </ActionPanel>
  );

  return (
    <Form actions={ActionView} isLoading={isLoading}>
      <Form.Dropdown title="Server" info={InfoServer} {...itemProps.server}>
        {props.servers.map((s) => (
          <Form.Dropdown.Item value={s} title={s} />
        ))}
      </Form.Dropdown>
      <Form.TextField title="Model" info={InfoModel} {...itemProps.model} />
    </Form>
  );
}
