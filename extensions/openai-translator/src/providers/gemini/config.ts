import { IConfig, IModel } from "../types";
import fetch from "node-fetch";

type ModelData = {
  models: [
    {
      supportedGenerationMethods: string[];
      name: string;
    },
  ];
};

const config: IConfig = {
  requireModel: true,
  defaultModel: {
    id: "gemini-pro",
    name: "gemini-pro",
  },
  supportCustomModel: false,
  /* eslint-disable @typescript-eslint/no-unused-vars */
  async listModels(apikey: string | undefined, _: string | undefined): Promise<IModel[]> {
    console.log(`${this.defaultEntrypoint}?key=${apikey}`);
    // apikey is not undefined or empty or null
    if (apikey) {
      const resp = await fetch(`${this.defaultEntrypoint}?key=${apikey}`);
      if (resp.status == 200) {
        const data = (await resp.json()) as ModelData;
        return data.models
          .filter((m) => m.supportedGenerationMethods.includes("generateContent"))
          .map((m) => {
            const name = m.name.replace(/^models\//, "");
            return { name, id: name };
          });
      }
    }
    return Promise.resolve([
      { name: "gemini-pro", id: "gemini-pro" },
      { name: "gemini-1.0-pro", id: "gemini-1.0-pro" },
      { name: "gemini-1.0-pro-001", id: "gemini-1.0-pro-001" },
      { name: "gemini-1.0-pro-latest", id: "gemini-1.0-pro-latest" },
      { name: "gemini-1.0-pro-vision-latest", id: "gemini-1.0-pro-vision-latest" },
      { name: "gemini-1.5-pro-latest", id: "gemini-1.5-pro-latest" },
    ]);
  },
  defaultEntrypoint: "https://generativelanguage.googleapis.com/v1beta/models",
  supportCustomEntrypoint: false,
  requireApiKey: true,
  hasApiKey: true,
};

export default config;
