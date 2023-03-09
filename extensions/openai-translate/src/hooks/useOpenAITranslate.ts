import { useState } from 'react';
import { Configuration, OpenAIApi } from 'openai';
import axios from 'axios';
import buildUserPrompt, { SYS_PROMPT } from '@utils/prompts';

export interface TranslateQuery {
  openAiConfig: {
    openaiApiKey: string;
    model: string;
    temperature: number;
    top_p: number;
    frequency_penalty: number;
    presence_penalty: number;
  };
  text: string;
  from: string;
  to: string;
}

export interface Response {
  content?: string;
  finishReason?: string;
}
const useOpenAITranslate = () => {
  const [data, setData] = useState<Response>({});
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const translate = async ({ openAiConfig, ...translateQuery }: TranslateQuery) => {
    setError('');
    setIsLoading(true);
    try {
      const configuration = new Configuration({
        apiKey: openAiConfig.openaiApiKey,
      });
      const openai = new OpenAIApi(configuration);
      const userPrompt = buildUserPrompt(translateQuery.text, translateQuery.from, translateQuery.to);
      const completion = await openai.createChatCompletion({
        model: openAiConfig.model,
        temperature: openAiConfig.temperature,
        messages: [SYS_PROMPT, userPrompt],
        // The official Node.js lib doesn't have proper support for streaming
        // Work around: https://github.com/openai/openai-node#streaming-completions
        // stream: true,
      });
      setData({
        content: completion.data.choices[0].message?.content,
        finishReason: completion.data.choices[0].finish_reason,
      });
    } catch (error) {
      if (axios.isAxiosError(error)) {
        // Official Node.js lib uses Axios under the hood (ref: https://github.com/openai/openai-node#request-options)
        if (error.response?.status == 401) {
          setError('Unauthorized: Please ensure you have the correct API key.');
        }
      } else {
        setError('Unknown error occurred while translating with OpenAI.');
      }
    }
    setIsLoading(false);
  };

  return { data, error, isLoading, translate };
};

export default useOpenAITranslate;
