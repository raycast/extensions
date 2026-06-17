export type ContentFormat = "html" | "text" | "markdown";

export type ResultViewProps = {
  sys_prompt: string;
  selected_text?: string; // If defined, uses this as selected text
  user_extra_msg?: string; // Textfield in Form -> If not empty, appends this to the user message
  model_override: string;
  toast_title: string;
  temperature?: number;
  content_format?: ContentFormat;
};
