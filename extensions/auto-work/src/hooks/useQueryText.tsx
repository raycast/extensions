import { clearSearchBar, showToast, Toast, Cache } from '@raycast/api';
import { useMemo, useState } from 'react';
import say from 'say';
import { v4 as uuidv4 } from 'uuid';
import { Chat, Model } from '../type';
import { chatTransfomer } from '../utils';
import { useAutoTTS } from './useAutoTTS';
import { useChatGPT } from './useChatGPT';
import { useProxy } from './useProxy';
import { PromptCollection } from './useModel';

export function useQueryText<T extends Chat>(props: T): any {
  const cache = new Cache();
  const [data, setData] = useState<Chat>(props);
  const [isLoading, setLoading] = useState<boolean>(false);
  const isAutoTTS = useAutoTTS();
  const proxy = useProxy();

  const chatGPT = useChatGPT();

  async function ask(question: string, model: Model, promptType?: string) {
    if (!question) return;
    let chat: Chat = {
      id: uuidv4(),
      question,
      answer: '',
      created_at: new Date().toISOString(),
    };
    const prompt = promptType === 'summarize' ? 'summarize' : 'improve';
    const cacheKey = Buffer.from(`${prompt}-${question}`).toString('base64');
    const cachedData = cache.get(cacheKey.slice(0, 40));
    if (cachedData) {
      const newChat = { ...chat, answer: cachedData };
      setLoading(false);
      return setData(newChat);
    }
    setLoading(true);
    const toast = await showToast({
      title: 'Getting your answer...',
      style: Toast.Style.Animated,
    });
    await chatGPT
      .createChatCompletion(
        {
          model: model.option,
          temperature: model.temperature,
          messages: [...chatTransfomer([], prompt || PromptCollection.summarize), { role: 'user', content: question }],
        },
        {
          proxy,
        }
      )
      .then((res) => {
        const answer = res.data.choices[0]?.message?.content || '';
        chat = { ...chat, answer };
        if (typeof chat.answer === 'string') {
          setLoading(false);
          clearSearchBar();

          toast.title = 'Got your answer!';
          toast.style = Toast.Style.Success;

          if (isAutoTTS) {
            say.stop();
            say.speak(chat.answer);
          }
          cache.set(cacheKey, answer);
          setData(chat);
        }
      })
      .catch((err) => {
        toast.title = 'Error';
        if (err instanceof Error) {
          toast.message = err?.message;
        }
        toast.style = Toast.Style.Failure;
      });
  }
  return useMemo(() => ({ data, setData, isLoading, setLoading, ask }), [data, setData, isLoading, setLoading, ask]);
}
