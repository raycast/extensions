import { IConfig, IModel } from "../types";

const config: IConfig = {
  requireModel: false,
  supportCustomModel: false,
  defaultModel: undefined,

  /* eslint-disable @typescript-eslint/no-unused-vars */
  async listModels(apikey: string | undefined, _: string | undefined): Promise<IModel[]> {
    return Promise.resolve([]);
  },
  defaultEntrypoint: "",
  supportCustomEntrypoint: true,
  requireApiKey: true,
  hasApiKey: true,
};

export default config;
