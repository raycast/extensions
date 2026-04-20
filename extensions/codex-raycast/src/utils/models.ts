export enum Model {
  GPT_5_4_MINI = "gpt-5.4-mini",
  GPT_5_4 = "gpt-5.4",
}

export type ModelOption = {
  value: Model;
  title: string;
};

export const DEFAULT_MODEL = Model.GPT_5_4_MINI;

export const MODEL_OPTIONS: ModelOption[] = [
  {
    value: Model.GPT_5_4_MINI,
    title: "GPT 5.4 Mini",
  },
  {
    value: Model.GPT_5_4,
    title: "GPT 5.4",
  },
];
