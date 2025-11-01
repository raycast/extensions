export type Type = "filepath" | "url" | "markdown";

export interface Image {
  type: Type;
  value: string;
}

export type Input = Image;
export type Output = Image;

export interface Imager {
  get(): Image;

  set(i: Image): void;
}

export type V = string | number | boolean | Config;
export type Config = { [key: string]: V };

export type ActionFn =
  | ((i: Input) => Promise<Output>)
  | ((i: Input, config: Config) => Promise<Output>)
  | ((i: Input, config: Config, services: Record<string, Config>) => Promise<Output>)
  | ((i: Input, config: Config, services: Record<string, Config>, originImage: Imager) => Promise<Output>);

export interface IWorkflow {
  run: (i: Input) => Promise<Output>;
}

export type WorkflowAlias = "default" | "file" | string;

export interface WorkflowNode {
  action: string;
  name: string;
  params: Config;
}

export interface WorkflowConfigs {
  workflows: Record<WorkflowAlias, WorkflowNode[]>;
  services: Record<string, Config>;
}
