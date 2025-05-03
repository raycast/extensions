import { useCallback, useMemo, useState } from "react";
import { chatCompletion } from "../utils/chatglm";
import { fetchContent } from "../utils/webcontent";
import { clearSearchBar } from "@raycast/api";
import { Message, ChatHook, ChatBox } from "../type";

const FEATURE_STREAM = true;

export function useChat(saved: ChatBox): ChatHook {
  const boxId = saved.boxId;
  const [messages, setMessages] = useState<Message[]>(saved.messages);
  const [isLoading, setLoading] = useState<boolean>(false);
  async function ask(question: string) {
    clearSearchBar();
    setLoading(true);
    const msg: Message = {
      id: messages.length + 1,
      question,
      answer: "Loading ...",
      timestamp: Date.now(),
      prompt: [],
    };
    let content = { title: question, content: question };
    if (/^http(s)?:\/\//.test(question)) {
      content = await fetchContent(question);
      msg.prompt = [
        // { role: "user", content: "请阅读文字内容，并找到摘要。输出格式为：\n标题: {title}\n\n 摘要: {content}\n" },
        {
          role: "user",
          content:
            "Please read the text content and find the summary. The output format is:\nTitle:{title}\n\n Summary:{content}\n",
        },
        { role: "assistant", content: "OK, I will summarize your text in English" },
        { role: "user", content: content.content },
      ];
    } else {
      // 对文章进行提问
      const previous = messages[messages.length - 1];
      msg.prompt = [
        ...(previous
          ? previous.prompt
          : [
              {
                role: "user",
                content: `You are an artificial intelligence assistant, please try to answer my questions in English. 
                I will ask you some questions about a web article. 
                If I forget to give you the URL or any page content, please be sure to remind me to enter the URL first.`,
              },
            ]),
        ...(previous
          ? [{ role: "assistant", content: previous.answer }]
          : [{ role: "assistant", content: "Sure. Please send me the URL of the article you want to discuss" }]),
        {
          role: "user",
          content: content.content,
        },
      ];
    }
    messages.push(msg);
    setMessages([...messages]);
    if (FEATURE_STREAM) {
      const streamListener = (data: string, isFinish: boolean) => {
        const guessTitle = data.trim().slice(0, 50);

        if (guessTitle.indexOf("标题") == 0 || /[tT]itle/.test(guessTitle)) {
          msg.question = guessTitle.replace(/标题\s*([：:]?\s*)?\s*/g, "").replace(/title\s*(:\s*)?/gi, "");
          msg.question = msg.question.trim().split("\n")[0].trim();
        }
        msg.answer = data;

        if (isFinish) {
          setLoading(false);
        }

        setMessages([...messages]);
      };
      const res = await chatCompletion(msg.prompt, { useStream: true, streamListener: streamListener });
      if (res == "") {
        setLoading(false);
      }
    } else {
      const detail = await chatCompletion(msg.prompt);
      if (detail.trim().indexOf("标题") == 0 || detail.trim().indexOf("Title:") == 0) {
        msg.question = detail.trim().split("\n")[0].replace("标题:", "").replace("标题：", "").replace("Title:", "");
      }
      msg.prompt.push({ role: "assistant", content: detail });
      msg.answer = detail;
      setMessages([...messages]);
      setLoading(false);
    }
  }

  const clear = useCallback(async () => {
    setMessages([]);
  }, [setMessages]);

  return useMemo(
    () => ({ boxId, messages, setMessages, isLoading, setLoading, ask, clear }),
    [boxId, messages, setMessages, isLoading, setLoading, ask, clear],
  );
}
