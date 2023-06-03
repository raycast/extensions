import { clearSearchBar, showToast, Toast } from '@raycast/api';
import { useCallback, useMemo, useState } from 'react';
import say from 'say';
import { v4 as uuidv4 } from 'uuid';
import { Chat, ChatHook, Model } from '../type';
import { chatTransfomer } from '../utils';
import { useAutoTTS } from './useAutoTTS';
import { useChatGPT } from './useChatGPT';
import { useHistory } from './useHistory';
import { useProxy } from './useProxy';

export function useChat<T extends Chat>(props: T[]): ChatHook {
  const [data, setData] = useState<Chat[]>(props);
  const [selectedChatId, setSelectedChatId] = useState<string | null>(null);
  const [isLoading, setLoading] = useState<boolean>(false);

  const history = useHistory();
  const isAutoTTS = useAutoTTS();
  const proxy = useProxy();

  const chatGPT = useChatGPT();

  async function ask(question: string, model: Model) {
    setLoading(true);
    const toast = await showToast({
      title: 'Getting your answer...',
      style: Toast.Style.Animated,
    });

    let chat: Chat = {
      id: uuidv4(),
      question,
      answer: '',
      created_at: new Date().toISOString(),
    };

    setData((prev) => {
      return [...prev, chat];
    });

    setTimeout(async () => {
      setSelectedChatId(chat.id);
    }, 30);
    console.log('-model prompt', model.prompt);
    await chatGPT
      .createChatCompletion(
        {
          model: model.option,
          temperature: model.temperature,
          messages: [...chatTransfomer(data, model.prompt), { role: 'user', content: question }],
        },
        {
          proxy,
        }
      )
      .then((res) => {
        chat = { ...chat, answer: res.data.choices.map((x) => x.message)[0]?.content ?? '' };
        if (typeof chat.answer === 'string') {
          setLoading(false);
          clearSearchBar();

          toast.title = 'Got your answer!';
          toast.style = Toast.Style.Success;

          if (isAutoTTS) {
            say.stop();
            say.speak(chat.answer);
          }

          setData((prev) => {
            return prev.map((a) => {
              if (a.id === chat.id) {
                return chat;
              }
              return a;
            });
          });

          history.add(chat);
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

  const clear = useCallback(async () => {
    setData([]);
  }, [setData]);

  return useMemo(
    () => ({ data, setData, isLoading, setLoading, selectedChatId, setSelectedChatId, ask, clear }),
    [data, setData, isLoading, setLoading, selectedChatId, setSelectedChatId, ask, clear]
  );
}
