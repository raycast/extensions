import * as React from "react";
import { Action, ActionPanel, Detail, Icon, Toast, showToast } from "@raycast/api";
import { getSelectedText, environment } from "@raycast/api";
import fetch from "node-fetch";

// ollama api post request body.
interface OllamaPostGenerateBody {
  model: string;
  prompt: string;
}

// ollama api post 'api/create' request body.
interface OllamaPostCreateBody {
  name: string;
  path: string;
}

// ollama api response format for undone response.
interface OllamaResponseUnDone {
  model: string;
  created_at: string;
  response: string;
  done: boolean;
}

// ollama api response format for last response.
interface OllamaResponseDone {
  model: string;
  created_at: string;
  done: boolean;
  context: number[];
  total_duration: number;
  prompt_eval_count: number;
  prompt_eval_duration: number;
  eval_count: number;
  eval_duration: number;
}

// ollama api response model tags.
interface OllamaResponseTags {
  models: OllamaResponseModel[];
}

// ollama api response model.
interface OllamaResponseModel {
  name: string;
  modified_at: string;
  size: string;
}

// prop type for ActionPanel.
interface AnswerProp {
  metadata: AnswerPropMetadata;
  answer: string;
  error: boolean;
}

// prop type for ActionPanel.Metadata.
interface AnswerPropMetadata {
  model: string;
  total_duration: number;
  prompt_eval_count: number;
  prompt_eval_duration: number;
  eval_count: number;
  eval_duration: number;
}

// function for retrive selected text.
async function getSelectedT(): Promise<string> {
  try {
    return await getSelectedText();
  } catch (err) {
    throw "You need to select a text for perform this command";
  }
}

// function for verify if base model is installed.
async function verifyModelIsInstalled(model: string): Promise<[boolean, string]> {
  const url = "http://localhost:11434/api/tags";
  const ModelMap = new Map<string, string>([
    ["raycast_orca:3b", "orca:latest"],
    ["raycast_llama2:7b", "llama:latest"],
    ["raycast_llama2:13b", "llama:13b"],
  ]);

  const models = await fetch(url)
    .then((response) => response.text())
    .then((output): OllamaResponseTags => {
      return JSON.parse(output);
    })
    .catch(() => {
      throw "Verify ollama is installed and currently running.";
    });

  let modelIsInstalled = false;
  models.models.forEach((row) => {
    if (ModelMap.get(model) === row.name) {
      modelIsInstalled = true;
    }
  });
  return [modelIsInstalled, ModelMap.get(model) as string];
}

// function for install custom model.
function installCustomModel(model: string): Promise<boolean> {
  const url = "http://localhost:11434/api/create";
  const ModelFileMap = new Map<string, string>([
    ["raycast_orca:3b", `${environment.assetsPath}/prompt/raycast_orca_3b`],
    ["raycast_llama2:7b", `${environment.assetsPath}/prompt/raycast_llama2:7b`],
    ["raycast_llama2:13b", `${environment.assetsPath}/prompt/raycast_llama2:13b`],
  ]);
  const body: OllamaPostCreateBody = {
    name: model,
    path: ModelFileMap.get(model) as string,
  };

  return fetch(url, {
    method: "POST",
    body: JSON.stringify(body),
  })
    .then((response) => {
      if (response.ok) {
        return response.text();
      }

      throw `Something goes wrong creating custom model ${body.name} with file ${body.path}`;
    })
    .then(() => true)
    .catch((err) => {
      if (typeof err === "string") {
        throw err;
      }
      console.error(err);
      throw "Verify ollama is installed and currently running.";
    });
}

// cal ollama api for retrieving answer
async function getAnswer(prompt: string, model: string): Promise<AnswerProp> {
  const url = "http://localhost:11434/api/generate";
  const body: OllamaPostGenerateBody = {
    model: model,
    prompt: prompt,
  };
  let answerProp: AnswerProp | undefined;

  while (answerProp === undefined) {
    answerProp = await fetch(url, {
      method: "POST",
      body: JSON.stringify(body),
    })
      .then(async (response) => {
        if (response.ok) {
          return response.text();
        }

        if (response.status === 400) {
          return await verifyModelIsInstalled(model).then(async (modelIsInstalled) => {
            if (modelIsInstalled[0]) {
              await installCustomModel(model)
                .then(() => {
                  return undefined;
                })
                .catch((err) => {
                  throw err;
                });
            } else {
              throw `Base model is not installed, run 'ollama pull ${modelIsInstalled[1]}' for install it.`;
            }
          });
        }

        throw "Verify ollama is installed and currently running.";
      })
      .then((output) => {
        if (output === undefined) {
          return undefined;
        }
        const answerProp: AnswerProp = {
          answer: "",
          metadata: {} as AnswerPropMetadata,
          error: false,
        };
        // split entire response on Array for eatch line
        const ollamaApiResponseArray = output.split("\n");

        // array of all undone response
        const ollamaApiResponseUndone = ollamaApiResponseArray.slice(0, -2);
        ollamaApiResponseUndone.forEach((row) => {
          try {
            const data: OllamaResponseUnDone = JSON.parse(row);
            if (data.response) {
              answerProp.answer += data.response;
            }
          } catch (err) {
            console.warn(err);
          }
        });

        // array of last response
        const ollamaApiResponseDone = ollamaApiResponseArray.slice(-2, -1);
        ollamaApiResponseDone.forEach((row) => {
          try {
            const data: OllamaResponseDone = JSON.parse(row);
            answerProp.metadata.model = data.model;
            answerProp.metadata.total_duration = data.total_duration;
            answerProp.metadata.prompt_eval_count = data.prompt_eval_count;
            answerProp.metadata.prompt_eval_duration = data.prompt_eval_duration;
            answerProp.metadata.eval_count = data.eval_count;
            answerProp.metadata.eval_duration = data.eval_duration;
          } catch (err) {
            console.warn(err);
          }
        });
        return answerProp;
      })
      .catch((err) => {
        if (typeof err === "string") {
          throw err;
        }
        console.error(err);
        throw "Verify ollama is installed and currently running.";
      });
  }
  return answerProp;
}

export default function ResultView(
  model: string,
  initialPrompt: string,
  endPrompt: string,
  selectText: boolean
): JSX.Element {
  const [loading, setLoading]: [boolean, React.Dispatch<React.SetStateAction<boolean>>] = React.useState(false);
  const [answer, setAnswer]: [string, React.Dispatch<React.SetStateAction<string>>] = React.useState("");
  const [answerMetadata, setAnswerMetadata]: [
    AnswerPropMetadata,
    React.Dispatch<React.SetStateAction<AnswerPropMetadata>>
  ] = React.useState({} as AnswerPropMetadata);
  let text = "";

  async function Inference(): Promise<void> {
    await showToast({ style: Toast.Style.Animated, title: "🧠 Performing Inference." });
    setLoading(true);
    getAnswer(initialPrompt + text + endPrompt, model)
      .then(async (data) => {
        await showToast({ style: Toast.Style.Success, title: "🧠 Inference Done." });
        setAnswer(data.answer);
        setAnswerMetadata(data.metadata);
        setLoading(false);
      })
      .catch(async (err) => {
        await showToast({ style: Toast.Style.Failure, title: err });
        setLoading(false);
      });
  }

  React.useEffect(() => {
    if (selectText) {
      getSelectedT()
        .then(async (selectedText) => {
          text = selectedText;
          Inference();
        })
        .catch(async (err) => {
          await showToast({ style: Toast.Style.Failure, title: err });
          console.error(err);
        });
    } else {
      Inference();
    }
  }, []);

  return (
    <Detail
      markdown={answer}
      isLoading={loading}
      actions={
        !loading && (
          <ActionPanel title="Actions">
            <Action.CopyToClipboard content={answer} />
            <Action title="Retry" onAction={Inference} shortcut={{ modifiers: ["cmd"], key: "r" }} icon={Icon.Repeat} />
          </ActionPanel>
        )
      }
      metadata={
        !loading && (
          <Detail.Metadata>
            <Detail.Metadata.Label title="Model" text={answerMetadata.model} />
            <Detail.Metadata.Separator />
            <Detail.Metadata.Label
              title="Total Inference Duration"
              text={`${(answerMetadata.total_duration / 1e9).toFixed(2)}s`}
            />
            <Detail.Metadata.Label title="Prompt Eval Count" text={`${answerMetadata.prompt_eval_count}`} />
            <Detail.Metadata.Label
              title="Prompt Eval Duration"
              text={`${(answerMetadata.prompt_eval_duration / 1e9).toFixed(2)}s`}
            />
            <Detail.Metadata.Label title="Eval Count" text={`${answerMetadata.eval_count}`} />
            <Detail.Metadata.Label title="Eval Duration" text={`${(answerMetadata.eval_duration / 1e9).toFixed(2)}s`} />
          </Detail.Metadata>
        )
      }
    />
  );
}
