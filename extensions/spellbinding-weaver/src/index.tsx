import {
  ActionPanel,
  Action,
  showToast,
  getPreferenceValues,
  Toast,
  Form,
  Icon,
  List,
  openExtensionPreferences,
  closeMainWindow,
  Clipboard,
} from "@raycast/api";
import request from "axios";
import { useEffect, useState } from "react";
import { Configuration, OpenAIApi } from "openai";

interface Preferences {
  openAiApiKey: string;
  temperature: number;
  model: string;
  maxTokens: number;
  topP: number;
  frequencyPenalty: number;
  presencePenalty: number;
}

interface gptCompletion {
  status: number;
  statusText: string;
  request?: any;
  data: any;
}

interface gptFormValues {
  prompt: string;
  model: string;
  temperature: number;
  maxTokens: string;
  topP: number;
  frequencyPenalty: number;
  presencePenalty: number;
}

const configuration = new Configuration({
  apiKey: getPreferenceValues<Preferences>().openAiApiKey,
});
const openai = new OpenAIApi(configuration);

export default function Command() {
  const preferences = getPreferenceValues<Preferences>();
  const [textPrompt, setTextPrompt] = useState("");
  const [searchText, setSearchText] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (prompt: string) => {
    await showToast({ title: "Prompt Sent" });
    setIsLoading(true);
    try {
      const completion: gptCompletion = await openai.createCompletion({
        model: getPreferenceValues<Preferences>().model,
        prompt: prompt,
        temperature: Number(getPreferenceValues<Preferences>().temperature),
        max_tokens: Number(getPreferenceValues<Preferences>().maxTokens),
        top_p: Number(getPreferenceValues<Preferences>().topP),
        frequency_penalty: Number(getPreferenceValues<Preferences>().frequencyPenalty),
        presence_penalty: Number(getPreferenceValues<Preferences>().presencePenalty),
      });
      await showToast({ title: "Answer Received" });
      const response = completion.data.choices[0].text;
      await Clipboard.copy(response);
      await Clipboard.paste(response);
      await closeMainWindow({ clearRootSearch: true });
    } catch (error) {
      if (request.isAxiosError(error) && error.response) {
        await showToast({ style: Toast.Style.Failure, title: "Error:", message: error.response.data.error.message });
      } else {
        await showToast({
          style: Toast.Style.Failure,
          title: "Error:",
          message: "Something went wrong but I am not sure what",
        });
      }
    }
    setIsLoading(false);
  };

  return (
    <List isLoading={isLoading} searchText={searchText} onSearchTextChange={setSearchText}>
      <List.EmptyView
        icon={{ source: "sweaver-icon@1024px.png" }}
        title="Type your spell, let the magic happen"
        actions={
          <ActionPanel title="Spellbinding Weaver">
            <Action title="Do the magic" onAction={() => handleSubmit(searchText)} />
            <Action title="Open Extension Preferences" onAction={openExtensionPreferences} />
          </ActionPanel>
        }
      />
    </List>
  );
}
