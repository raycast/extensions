import fetch from "node-fetch";
import { IConfig, IModel } from "../types";
import { dropdownDataByName } from "../../raycast-utils";

const config: IConfig = {
  requireModel: true,
  defaultModel: {
    id: "gpt-3.5-turbo",
    name: "gpt-3.5-turbo",
  },
  supportCustomModel: true,
  /* eslint-disable @typescript-eslint/no-unused-vars */
  async listModels(apikey: string | undefined, entrypoint: string | undefined): Promise<IModel[]> {
    const predefine = dropdownDataByName("apiModel");
    // map {title: string, value:string} to {name:string, id: string}
    const fallbackModels: IModel[] =
      predefine?.map((model) => ({
        name: model.title,
        id: model.value,
      })) || [];
    let result = fallbackModels;
    if (entrypoint && entrypoint !== "") {
      const url = entrypoint.replace("/chat/completions", "/models");

      try {
        const response = await fetch(url, {
          method: "GET",
          headers: {
            Authorization: `Bearer ${apikey}`,
          },
        });

        if (!response.ok) {
          console.error(`API request failed with status ${response.status}`);
        }

        const data = (await response.json()) as { data: { id: string }[] };
        // check gpt inside the model list
        result = data.data
          .filter((model: { id: string }) => {
            return model.id.includes("gpt");
          })
          .map((model: { id: string }) => ({
            name: model.id,
            id: model.id,
          }));
        return result;
      } catch (error) {
        console.error("Failed to fetch model list from API, using fallback models:", error);
      }
    }
    return Promise.resolve(result);
  },
  defaultEntrypoint: "https://api.openai.com/v1/chat/completions",
  supportCustomEntrypoint: true,
  requireApiKey: false,
  hasApiKey: true,
};

export default config;
