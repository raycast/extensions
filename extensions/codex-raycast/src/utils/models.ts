export enum Model {
  GPT_5_4 = "gpt-5.4",
  GPT_5_1_CODEX_MINI = "gpt-5.1-codex-mini",
}

export type ModelOption = {
  value: Model;
  title: string;
};

export const DEFAULT_MODEL = Model.GPT_5_4;

export const MODEL_OPTIONS: ModelOption[] = [
  {
    value: Model.GPT_5_4,
    title: "GPT 5.4",
  },
  {
    value: Model.GPT_5_1_CODEX_MINI,
    title: "GPT 5.1 Codex Mini",
  },
];
