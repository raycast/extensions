import { IConfig, IModel } from "../types";
import fetch from "node-fetch";

const _baseUrl = "https://api.moonshot.cn";

type ModelData = {
  data: [
    {
      id: string;
    },
  ];
};

const config: IConfig = {
  requireModel: true,
  defaultModel: {
    id: "moonshot-v1-8k",
    name: "moonshot-v1-8k",
  },
  supportCustomModel: false,
  /* eslint-disable @typescript-eslint/no-unused-vars */
  async listModels(apikey: string | undefined, _: string | undefined): Promise<IModel[]> {
    console.log(`${this.defaultEntrypoint}?key=${apikey}`);
    // apikey is not undefined or empty or null
    if (apikey) {
      const resp = await fetch(`${_baseUrl}/v1/models`, {
        headers: {
          Authorization: `Bearer ${apikey}`,
        },
      });
      if (resp.status == 200) {
        const data = (await resp.json()) as ModelData;
        console.log(data);
        return data.data.map((m) => {
          const name = m.id;
          return { name, id: name };
        });
      }
    }
    return Promise.resolve([
      { name: "moonshot-v1-8k", id: "moonshot-v1-8k" },
      { name: "moonshot-v1-32k", id: "moonshot-v1-32k" },
      { name: "moonshot-v1-128k", id: "moonshot-v1-128k" },
    ]);
  },

  defaultEntrypoint: `${_baseUrl}/v1/chat/completions`,
  supportCustomEntrypoint: false,
  requireApiKey: true,
  hasApiKey: true,
};

export default config;
