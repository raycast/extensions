import axios from "axios";
import { getPreferenceValues } from "@raycast/api";

type Preferences = {
  apiToken: string;
};

const { apiToken } = getPreferenceValues<Preferences>();
export async function sendOpenAIRequest(prompt: string, text: string): Promise<string> {
  const response = await axios.post(
    "https://api.openai.com/v1/chat/completions",
    {
      model: "gpt-3.5-turbo",
      messages: [{ role: "user", content: prompt + text }],
      max_tokens: 1000,
    },
    {
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiToken}`,
      },
    },
  );
  return response.data.choices[0].message.content;
}
