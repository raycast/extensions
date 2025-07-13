import { AI, Toast, environment, getPreferenceValues, showToast } from "@raycast/api";
import { Placeholder, PlaceholderCategory, PlaceholderType } from "placeholders-toolkit";

/**
 * Directive to query Raycast AI and insert the response. If the query fails, the placeholder will be replaced with an empty string.
 *
 * Syntax: `{{ai:prompt}}` or `{{ai model="[model]":prompt}}` or `{{ai model="[model]" creativity=[decimal]:prompt}}`
 *
 * The model and creativity are optional. The default model is `open-gpt-3.5-turbo` and the default creativity is `1.0`. The creativity must be a decimal between 0 and 1.
 */
const AskAIDirective: Placeholder = {
  name: "askAI",
  regex:
    /{{(askAI|askai|AI|ai)( model="(([^{]|{(?!{)|{{[\s\S]*?}})*?)")?( creativity=(([^{]|{(?!{)|{{[\s\S]*?}})*?))?:(([^{]|{(?!{)|{{[\s\S]*?}})*?)}}/,
  rules: [],
  apply: async (str: string) => {
    const matches = str.match(
      /{{(askAI|askai|AI|ai)( model="(([^{]|{(?!{)|{{[\s\S]*?}})*?)")?( creativity=(([^{]|{(?!{)|{{[\s\S]*?}})*?))?:(([^{]|{(?!{)|{{[\s\S]*?}})*?)}}/,
    );
    if (matches && environment.canAccess(AI)) {
      const toast = await showToast({ title: "Querying AI...", style: Toast.Style.Animated });
      const preferences = getPreferenceValues<ExtensionPreferences>();
      const modelString = matches[3] || "";
      const model =
        Object.entries(AI.Model).find(
          ([key, value]) =>
            key.toLowerCase() === modelString.toLowerCase() || value.toLowerCase() === modelString.toLowerCase(),
        )?.[1] || AI.Model[preferences.defaultAIModel];
      const creativity = matches[6] || "1.0";
      let query = matches[8].substring(0, 4096);
      let result = "";
      let attempt = 0;
      let waiting = true;

      if (!environment.canAccess(AI)) {
        toast.title = "AI Access Denied";
        toast.style = Toast.Style.Failure;
        return { result: "" };
      }

      while (waiting) {
        try {
          result = await AI.ask(query, { model: model as AI.Model, creativity: parseFloat(creativity) || 1.0 });
        } catch (e) {
          attempt++;
          query = query.substring(0, query.length / 1.5);
        }
        if (result != "" || attempt > 10) {
          waiting = false;
        }
      }
      toast.title = "Received Response";
      toast.style = Toast.Style.Success;
      const res = result.trim().replaceAll('"', "'");
      return { result: res };
    }
    return { result: "" };
  },
  constant: false,
  fn: async (prompt?: string, model?: string) => {
    return (await AskAIDirective.apply(`{{askAI${model ? ` model="${model}"` : ``}:${prompt}}}`)).result;
  },
  example: '{{ai model="gpt-3.5-turbo":What is the meaning of life?}}',
  description:
    "Query Raycast AI and insert the response. If the query fails, the placeholder will be replaced with an empty string.",
  hintRepresentation: "{{ai:...}}",
  fullRepresentation: "Ask AI",
  type: PlaceholderType.InteractiveDirective,
  categories: [PlaceholderCategory.Internet],
};

export default AskAIDirective;
