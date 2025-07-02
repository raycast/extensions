export type TemplateType = "command" | "template";

export type Template = {
  id: string;
  name: string;
  category: string;
  imagePath?: string;
  type: TemplateType;
  command?: string;
  templatePath?: string;
  setupCommand?: string;
  autoCreateRepo?: boolean;
};
