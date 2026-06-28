import { useEffect, useState } from "react";
import { Form, ActionPanel, Action, showToast, Toast, confirmAlert } from "@raycast/api";
import fetch from "node-fetch";
import delay from "delay";
import { models, Model, OpenApiSchema } from "../models";
import open from "open";
import crypto from "crypto";
import { copyImage, saveImage } from "../utils/helpers";

type Values = {
  textfield: string;
  textarea: string;
  datepicker: Date;
  checkbox: boolean;
  dropdown: string;
  tokeneditor: string[];
};

type Option = {
  name?: string;
  "x-order"?: string;
  values?: {
    default: string;
    description: string;
    type: string;
    enum: string[];
  };
  [key: string]: any;
};

// Okay I got bored of writing TypeScript types so I'm cheating here. Sue me.
type Prediction = {
  [key: string]: any;
};

interface ModelResult {
  models: Model[];
}

const generateId = (name: string) => `${crypto.randomUUID()}-${name}`;

export default function RenderForm(props: { token: string; modelName: string }) {
  const [isLoading, setIsLoading] = useState(false);
  const [options, setOptions] = useState<Option[]>([]);
  const [modelName, setModelName] = useState(props.modelName);
  const [modelOptions, setModelOptions] = useState<Model[]>(models);

  async function handler(values: Values) {
    const model = (await getModelByName(modelName)) as Model;

    /**
     * Filter out empty values. After this we'll end up with a map that looks like this:
     *
     * filteredValues = {
            guidance_scale: "7.5",
            height: "512",
            num_inference_steps: "50",
            num_outputs: "1",
            prompt: "a cow",
            prompt_strength: "0.8",
            scheduler: "K-LMS",
            width: "512",
        };

     * I would love for there to be a cleaner way to do this...
     */
    let filteredValues: Option = Object.fromEntries(Object.entries(values).filter(([_, v]) => v));
    filteredValues = Object.fromEntries(
      Object.entries(filteredValues).map(([k, v]) => [k.replace(model.name, "").replace("-", ""), v])
    );

    // I know this is unforunate, but loop through and convert values to correct type
    for (const entry of Object.entries(filteredValues)) {
      const option = options.filter((option) => option.name === entry[0])[0];

      if (option && option.values && (option.values.type === "number" || option.values.type === "integer")) {
        if (option.values.type === "integer") {
          filteredValues[entry[0]] = parseInt(entry[1] as string);
        }

        if (option.values.type === "number") {
          filteredValues[entry[0]] = parseFloat(entry[1] as string);
        }
      }
    }

    console.log("Submission: ", filteredValues);

    const response = await fetch("https://api.replicate.com/v1/predictions", {
      method: "POST",
      headers: {
        Authorization: `Token ${props.token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        version: model?.latest_version?.id,
        input: filteredValues,
      }),
    });

    const prediction = (await response.json()) as Prediction;
    return prediction;
  }

  async function getModelByName(name: string) {
    const model = modelOptions.filter((model) => model.name === name);
    return getModel(model[0].owner, model[0].name);
  }

  async function getModel(owner: string, name: string) {
    const response = await fetch(`https://api.replicate.com/v1/models/${owner}/${name}`, {
      method: "GET",
      headers: {
        Authorization: `Token ${props.token}`,
        "Content-Type": "application/json",
      },
    });

    const result = (await response.json()) as Model;
    return result;
  }

  async function getModelsByCollection(collection: string) {
    const response = await fetch(`https://api.replicate.com/v1/collections/${collection}`, {
      method: "GET",
      headers: {
        Authorization: `Token ${props.token}`,
        "Content-Type": "application/json",
      },
    });

    const result: ModelResult = (await response.json()) as ModelResult;

    // Add unique id to each model
    result.models.map((model: Model) => {
      model.id = generateId(model.name);
    });

    return JSON.stringify(result.models as Model[]);
  }

  const parseModelInputs = (model: Model) => {
    const options = model.latest_version?.openapi_schema.components.schemas.Input.properties;

    // convert options to array
    const newOptions = Object.keys(options).map((key) => {
      if ("allOf" in options[key]) {
        // newOptions[key]["enums"] = model.latest_version.openapi_schema.components.schemas;

        // This is gnarly, but it's how I'm getting the relevant enums for the dropdown
        // by parsing the openapi_schema and filtering out the enums that match the name of the option.
        const relevantEnums = (
          (Object.entries(model.latest_version?.openapi_schema.components.schemas) as []).filter(
            (entry) => (entry[0] as string) === key
          )[0][1] as OpenApiSchema
        ).enum;

        return { name: key, values: options[key], enums: relevantEnums };
      } else {
        return { name: key, values: options[key], enums: [] };
      }
    });

    return newOptions;
  };

  const handleSubmit = async (values: Values) => {
    setIsLoading(true);
    let prediction = await handler(values);

    while (prediction.status !== "succeeded" && prediction.status !== "failed") {
      await delay(1000);
      const response = await fetch(`https://api.replicate.com/v1/predictions/${prediction.id}`, {
        method: "GET",
        headers: {
          Authorization: `Token ${props.token}`,
          "Content-Type": "application/json",
        },
      });
      prediction = (await response.json()) as Prediction;

      if (response.status !== 200 || prediction.status == "failed") {
        setIsLoading(false);
        showToast({
          style: Toast.Style.Failure,
          title: "Error",
          message: `Something went wrong`,
          primaryAction: {
            title: "View Prediction on Replicate",
            onAction: () => {
              open(`https://replicate.com/p/${prediction.id}`);
            },
          },
        });
        return;
      }

      //   Show Logs
      console.log(prediction.logs);

      if (prediction.status === "succeeded") {
        setIsLoading(false);

        const start = new Date(prediction.created_at);
        const end = new Date(prediction.completed_at);

        const differenceInSeconds = (end.getTime() - start.getTime()) / 1000;

        await confirmAlert({
          title: "Prediction Complete",
          message: `Your prediction for '${prediction.input.prompt}' finished in ${differenceInSeconds} seconds. Copy the image to your clipboard?`,
          icon: {
            source: prediction.output[0],
          },
          primaryAction: {
            title: "Copy to Clipboard",
            onAction: () => {
              copyImage(prediction.output[0]);
            },
          },
          dismissAction: {
            title: "Close",
          },
        });

        showToast({
          style: Toast.Style.Success,
          title: "Prediction Success",
          message: prediction.output[0],
          primaryAction: {
            title: "Save Output as File",
            onAction: () => {
              saveImage(prediction.output[0]);
            },
          },
        });
      }
    }
  };

  function updateForm(modelName: string) {
    getModelByName(modelName).then((model) => {
      const options = parseModelInputs(model);
      setOptions(options.sort((a, b) => (a.values["x-order"] > b.values["x-order"] ? 1 : -1)));
      setModelName(modelName);
    });
  }

  useEffect(() => {
    updateForm(props.modelName);
    getModelsByCollection("diffusion-models").then((models) => {
      setModelOptions(JSON.parse(models));
    });
  }, []);

  return (
    <Form
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.Dropdown id="dropdown" title="Model" defaultValue={props.modelName} onChange={(e) => updateForm(e)}>
        {modelOptions.map((model) => (
          <Form.Dropdown.Item key={model.id} value={model.name} title={model.name} />
        ))}
      </Form.Dropdown>
      <Form.Separator />
      {options.map((option, i) => {
        return RenderFormInput({ option: option, modelName: modelName });
      })}
    </Form>
  );
}

function RenderFormInput(props: { option: Option; modelName: string }) {
  function toString(value: string | number | undefined) {
    if (value == null) {
      return "";
    } else {
      return value.toString();
    }
  }

  const optionValues = props.option.values;
  const optionDefault = props.option.values?.default;
  const optionDescription = props.option.values?.description;

  // Note, the ID is used to get the value of input field. Don't change the IDs!
  return "allOf" in (optionValues || []) ? (
    <>
      <Form.Description
        key={`description-${props.option.name}-${props.modelName}`}
        text={props.option.name || "Undefined"}
      />
      <Form.Dropdown id={`${props.modelName}-${props.option.name}`} defaultValue={toString(optionDefault)}>
        {props.option.enums.map((value: string | number, i: number) => (
          <Form.Dropdown.Item key={`${props.option.name}-${i}`} value={toString(value)} title={toString(value)} />
        ))}
      </Form.Dropdown>
    </>
  ) : (
    <>
      <Form.Description key={`description-${props.option.name}`} text={props.option.name || "Undefined"} />
      <Form.TextField
        id={`${props.modelName}-${props.option.name}`}
        defaultValue={toString(optionDefault)}
        info={optionDescription}
      />
    </>
  );
}
