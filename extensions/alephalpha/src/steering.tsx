import { Action, ActionPanel, Detail, Form, getPreferenceValues } from "@raycast/api";
import { FormValidation, useFetch, useForm } from "@raycast/utils";
import { useState, useEffect } from "react";
import { fetchStreamingSteeringApiResponse, StreamResponseEventEmitter, ModelSettings } from "./util/apiHelper";

interface SteeringFormValues {
  userPrompt: string;
  steeringConcept: string;
  model: string;
}

export default function SteeringCommand() {
  const preferences = getPreferenceValues<Preferences>();
  const [response, setResponse] = useState<string>("");
  const [showResult, setShowResult] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [streamEmitter, setStreamEmitter] = useState<StreamResponseEventEmitter | null>(null);

  const { data: models } = useFetch<ModelSettings[]>(`${preferences.apiUrl}/model-settings`, {
    headers: {
      Accept: "application/json",
      Authorization: "Bearer " + preferences.apiKey,
    },
  });

  const chatModels = models?.filter((model) => model.chat && model.status === "available") || [];

  // Set up stream event listeners
  useEffect(() => {
    if (!streamEmitter) return;

    const onChunk = (chunk: string) => {
      setResponse((prev) => prev + chunk);
    };

    const onError = () => {
      setIsLoading(false);
    };

    const onDone = () => {
      setIsLoading(false);
    };

    streamEmitter.on("chunk", onChunk);
    streamEmitter.on("error", onError);
    streamEmitter.on("done", onDone);

    return () => {
      streamEmitter.removeAllListeners();
    };
  }, [streamEmitter]);

  const { handleSubmit, itemProps } = useForm<SteeringFormValues>({
    async onSubmit(values) {
      setIsLoading(true);
      setShowResult(true);
      setResponse("");

      // Create a new emitter for streaming
      const emitter = new StreamResponseEventEmitter();
      setStreamEmitter(emitter);

      // Start streaming request
      fetchStreamingSteeringApiResponse(values.userPrompt, values.steeringConcept, values.model, emitter);
    },
    validation: {
      userPrompt: FormValidation.Required,
      steeringConcept: FormValidation.Required,
    },
  });

  if (showResult) {
    return (
      <Detail
        isLoading={isLoading}
        markdown={response}
        actions={
          <ActionPanel>
            <Action.CopyToClipboard content={response} />
            <Action title="New Chat" onAction={() => setShowResult(false)} />
          </ActionPanel>
        }
      />
    );
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Submit" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextArea title="User Prompt" {...itemProps.userPrompt} />
      <Form.Dropdown title="Steering Concept" defaultValue="lidl" storeValue={true} {...itemProps.steeringConcept}>
        <Form.Dropdown.Item key="lidl" value="lidl" title="Lidl" />
        <Form.Dropdown.Item key="shakespeare" value="shakespeare" title="Shakespeare" />
        <Form.Dropdown.Item key="slang" value="slang" title="Slang" />
        <Form.Dropdown.Item key="lesstoxic" value="lesstoxic" title="Less Toxic" />
      </Form.Dropdown>
      <Form.Separator />
      <Form.Dropdown title="Model" defaultValue="llama-3.1-8b-instruct" {...itemProps.model}>
        {chatModels.map((model) => (
          <Form.Dropdown.Item key={model.name} value={model.name} title={model.name} />
        ))}
      </Form.Dropdown>
    </Form>
  );
}
