export const allModels = [
  { name: "Follow global model", id: "global" },
  { name: "Mistral 8x7b Instruct", id: "mixtral-8x7b-instruct" },
  { name: "Llama2 70B Chat", id: "llama-2-70b-chat" },
  { name: "Perplexity 70B Chat", id: "pplx-70b-chat" },
  { name: "CodeLlama 70B Instruct", id: "codellama-70b-instruct" },
  { name: "Perplexity 7B Online", id: "pplx-7b-online" },
  { name: "Perplexity 70B Online", id: "pplx-70b-online" },
];

export const currentDate = new Date().toLocaleString("en-US", {
  weekday: "long",
  year: "numeric",
  month: "long",
  day: "numeric",
});

export type ResultViewProps = {
  sys_prompt: string;
  selected_text?: string; // If defined, uses this as selected text
  user_extra_msg?: string; // If not empty, appends this to the user message
  model_override: string;
  toast_title: string;
  temperature?: number;
};
