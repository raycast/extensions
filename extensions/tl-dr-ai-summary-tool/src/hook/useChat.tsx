import { useCallback, useMemo, useState } from "react";
import { chatCompletion } from "../utils/chatglm"
import { fetchContent } from "../utils/webcontent"
import { clearSearchBar } from "@raycast/api";
import { Message, ChatHook, ChatBox, PromptMessage } from "../type";

const FEATURE_STREAM = true;

export function useChat(saved: ChatBox): ChatHook {
    const boxId = saved.boxId;
    const [messages, setMessages] = useState<Message[]>(saved.messages);
    const [isLoading, setLoading] = useState<boolean>(false);
    async function ask(question: string) {
        clearSearchBar();
        setLoading(true);
        const msg: Message = {id: messages.length + 1, question, answer: "请稍候...", timestamp: Date.now(), prompt: []}
        const history = [...messages, msg ]
        setMessages(history)
        let content = {title: question, content: question};
        if (question.startsWith("http") && question.indexOf("weixin.qq.com") > -1 ){
          console.log(`请求网页 ${question}`)
          content = await fetchContent(question)
          msg.prompt = [{role: "user", content: "请阅读文字内容，并找到摘要。输出格式为：\n标题: {title}\n\n 摘要: {content}\n"}, 
          {role: "assistant", content: "好的"}, 
          {role: "user", content: content.content}]
        } else {
          // 对文章进行提问
          const previous = messages[messages.length - 1];
          msg.prompt = [...(previous?previous.prompt:[]), {
            role: "user", content: content.content
          }]
        }
        
        if (FEATURE_STREAM) {
          const streamListener = (data: string, isFinish: boolean) => {
            if (data.indexOf("标题") == 0){
              msg.question = data.split('\n')[0].replace("标题:","").replace("标题：","")
            }
            msg.answer = data;
            setMessages([...history])
            if (isFinish) {
              const assistant = {role: "assistant", content: msg.answer};
              msg.prompt.push(assistant);
              setLoading(false);
            }
          }
          await chatCompletion(msg.prompt, {useStream: true, streamListener: streamListener})
          
        } else {
          const detail = await chatCompletion(msg.prompt)
          if (detail.trim().indexOf("标题") == 0){
            msg.question = detail.trim().split('\n')[0].replace("标题:","").replace("标题：","")
          }
          msg.prompt.push({role: "assistant", content: detail})
          msg.answer = detail
          setMessages(history)
          setLoading(false);
        }
    }

    const clear = useCallback(async () => {
      setMessages([]);
    }, [setMessages]);

    return useMemo(() => ({boxId, messages, setMessages, isLoading, setLoading, ask, clear}), [boxId, messages, setMessages, isLoading, setLoading, ask, clear])
}