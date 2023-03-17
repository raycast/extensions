import { PreferenceValues, getPreferenceValues } from "@raycast/api";
import { OpenAIApi, Configuration } from "openai";

export const generateAnswer = async (prompt: string) => {
  const preferences: PreferenceValues = getPreferenceValues();
  const apiKey = preferences.OpenaiApiToken;

  const configuration = new Configuration({
    apiKey: apiKey,
  });

  const openai = new OpenAIApi(configuration);

  // const options = {
  //   model: "text-davinci-003",
  //   temperature: 0,
  //   max_tokens: 500,
  //   top_p: 1,
  //   frequency_penalty: 0.0,
  //   presence_penalty: 0.0,
  //   stop: "/n",
  // };

  // const completeOptions = {
  //   ...options,
  //   prompt: prompt,
  // };
  const response = await openai.createChatCompletion({
    model: "gpt-3.5-turbo",
    messages: [{ role: "user", content: prompt }],
    max_tokens: 500,
    stop: ["/n"],
  });
  if (response.data.choices.length < 0) {
    throw new Error("No response from OpenAI");
  }
  return response.data.choices[0].message?.content;
};
