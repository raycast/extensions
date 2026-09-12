type ConfigField = {
  name: string;
  description: string;
  guideText: string;
};

export type StringConfigField = ConfigField & {
  defaultValue: string;
  maxLength: string;
  minLength: string;
  regex: string;
  value?: string;
};

export type BooleanConfigField = ConfigField & {
  defaultValue: boolean;
  value?: boolean;
};

export type NumberConfigField = ConfigField & {
  defaultValue: string;
  min: string;
  max: string;
  value?: string;
};

/**
 * A PromptLab command setup configuration.
 */
export type CommandConfig = {
  /**
   * The list of configuration fields.
   */
  fields: (NumberConfigField | BooleanConfigField | StringConfigField)[];

  /**
   * The version of the configuration schema.
   */
  configVersion: string;
};
