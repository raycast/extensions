import { ActionPanel, Form, Action, showToast, Toast, useNavigation, Icon } from "@raycast/api";
import { Fragment, useEffect, useState } from "react";
import { CustomPrompt, CustomPrompts, ModelFormParams, ResultType } from "./types";
import { MODELS, fetchStorage, getRequestBody, getStorageCount, sendPrompt, setStorage } from "./utils";
import { parseNbr } from "./utils";
import { accessToken } from "./preferences";
import { useFetch } from "@raycast/utils";
import DisplayResult from "./result";
import CreatePrompt from "./create-prompt";
import CustomPromptsView from "./custom-prompts";
import HistoryView from "./history";

export default function AskView() {
  const [formValues, setFormValues] = useState<ModelFormParams>({
    prompt: "",
    role: undefined,
    model: "gpt",
    temperature: 1,
    n: 1,
    maxToken: undefined,
    presencePenalty: 0,
    frequencyPenalty: 0,
    size: undefined,
    system: undefined,
  });
  const { push } = useNavigation();
  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm
            icon={Icon.ArrowRight}
            onSubmit={async (values) => {
              push(<DisplayResult request={values} />);
              const index = (await getStorageCount()) + 1;
              setStorage(`${index}-${values?.model}`, JSON.stringify({ ...values, index: index }));
            }}
          />
          <Action
            title="Create prompt"
            icon={Icon.PlusCircle}
            onAction={() => {
              push(<CreatePrompt />);
            }}
            shortcut={{ modifiers: ["cmd"], key: "n" }}
          />
          <Action
            title="View custom prompts"
            icon={Icon.Bookmark}
            onAction={() => {
              push(<CustomPromptsView />);
            }}
            shortcut={{ modifiers: ["cmd"], key: "e" }}
          />
          <Action
            title="View history"
            icon={Icon.Clock}
            onAction={() => {
              push(<HistoryView />);
            }}
            shortcut={{ modifiers: ["cmd"], key: "h" }}
          />
        </ActionPanel>
      }
    >
      <Form.TextArea
        id="prompt"
        title="Prompt"
        autoFocus
        onChange={(e) => setFormValues({ ...formValues, prompt: e })}
      />
      <Form.Dropdown
        id="model"
        title="Model"
        defaultValue="gpt"
        onChange={(e) => setFormValues({ ...formValues, model: e })}
      >
        <Form.Dropdown.Item value="gpt" title="GPT-3" />
        <Form.Dropdown.Item value="dalle" title="DALL-E" />
      </Form.Dropdown>
      <Form.Separator />
      {formValues?.model === "gpt" ? (
        <GPTForm state={formValues} setState={setFormValues} />
      ) : (
        <DALLEForm state={formValues} setState={setFormValues} />
      )}
      {/* <Form.Separator /> */}
    </Form>
  );
}

const GPTForm = ({ state, setState }: { state: ModelFormParams; setState: (s: ModelFormParams) => void }) => {
  const [prompts, setPrompts] = useState<CustomPrompts>({});
  useEffect(() => {
    fetchStorage(true)
      .then(async (res) => {
        setPrompts(res);
      })
      .catch((err) => {
        console.log(err);
        showToast(Toast.Style.Failure, "Couldn't fetch storage");
      });
  }, []);
  return (
    <Fragment>
      <Form.Dropdown
        id="role"
        info="The custom system prompt."
        title="System prompt"
        defaultValue="none"
        onChange={(e) => setState({ ...state, role: e })}
      >
        <Form.Dropdown.Item value="none" title="None" />
        {Object.values(prompts).map((value) => {
          return (
            <Form.Dropdown.Item
              key={`custom-prompts-${value?.index}-${value?.name}`}
              value={value?.prompt}
              title={value?.name}
            />
          );
        })}
      </Form.Dropdown>
      <Form.TextField
        id="temperature"
        title="Temperature"
        value={String(state?.temperature)}
        placeholder="1"
        info="What sampling temperature to use, between 0 and 2. Higher values like 0.8 will make the output more random."
        // error={formError ? ERROR_MESSAGE : ""}
        onChange={(e) => setState({ ...state, temperature: parseNbr(e) })}
      />
      <Form.TextField
        id="n"
        title="N"
        placeholder="1"
        info="How many chat completion choices to generate for each input message."
        value={String(state?.n)}
        onChange={(e) => setState({ ...state, n: parseNbr(e) })}
      />
      <Form.TextField
        id="presencePenalty"
        title="Presence penalty"
        info="Number between -2 and 2, increasing the model's likelihood to talk about new topics."
        value={String(state?.presencePenalty)}
        placeholder="0"
        onChange={(e) => setState({ ...state, presencePenalty: parseNbr(e) })}
      />
      <Form.TextField
        id="frequencyPenalty"
        title="Frequency penalty"
        info="Number between -2 and 2,  decreasing the model's likelihood to repeat the same line verbatim."
        value={String(state?.frequencyPenalty)}
        placeholder="0"
        onChange={(e) => setState({ ...state, frequencyPenalty: parseNbr(e) })}
      />
    </Fragment>
  );
};

const DALLEForm = ({ state, setState }: { state: ModelFormParams; setState: (s: ModelFormParams) => void }) => {
  return (
    <Fragment>
      <Form.TextField
        id="n"
        title="Number of images"
        placeholder="1"
        info="The number of images to generate. Must be between 1 and 10."
        value={String(state?.n)}
        onChange={(e) => setState({ ...state, n: parseNbr(e) })}
      />
      <Form.Dropdown
        id="size"
        info="The size of the generated images."
        title="Size"
        defaultValue="1024x1024"
        onChange={(e) => setState({ ...state, size: e })}
      >
        <Form.Dropdown.Item value="256x256" title="256x256" />
        <Form.Dropdown.Item value="512x512" title="512x512" />
        <Form.Dropdown.Item value="1024x1024" title="1024x1024" />
      </Form.Dropdown>
    </Fragment>
  );
};
