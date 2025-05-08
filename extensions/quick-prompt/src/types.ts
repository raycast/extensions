export enum Filter {
  All = "all",
  Enabled = "enabled",
  Disabled = "disabled",
}

export interface Prompt {
  id: string;
  title: string;
  content: string;
  tags?: string[];
  /**
   * 是否启用
   * @default true
   */
  enabled: boolean;
}

export type PromptFormValues = {
  title: string;
  content: string;
  tags: string;
  enabled: boolean;
};
