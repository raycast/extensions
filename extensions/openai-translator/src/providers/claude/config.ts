import { IConfig, IModel } from "../types";

const config: IConfig = {
  requireModel: true,
  defaultModel: {
    id: "claude-3-haiku-20240307",
    name: "claude-3-haiku-20240307",
  },
  supportCustomModel: false,

  /* eslint-disable @typescript-eslint/no-unused-vars */
  async listModels(apikey: string | undefined, _: string | undefined): Promise<IModel[]> {
    const models = [
      "claude-3-opus-20240229",
      "claude-3-sonnet-20240229",
      "claude-3-haiku-20240307",
      "claude-2.1",
      "claude-2.0",
      "claude-instant-1.2",
    ];
    return Promise.resolve(models.map((m) => ({ name: m, id: m })));
  },
  defaultEntrypoint: "https://api.anthropic.com/v1/messages",
  supportCustomEntrypoint: false,
  requireApiKey: true,
  hasApiKey: true,
};

export default config;
