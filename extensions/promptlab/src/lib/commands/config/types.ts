
interface ConfigField {
  name: string;
  description: string;
  guideText: string;
}

export interface StringConfigField extends ConfigField {
  defaultValue: string;
  maxLength: string;
  minLength: string;
  regex: string;
  value?: string;
}

export interface BooleanConfigField extends ConfigField {
  defaultValue: boolean;
  value?: boolean;
}

export interface NumberConfigField extends ConfigField {
  defaultValue: string;
  min: string;
  max: string;
  value?: string;
}

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
