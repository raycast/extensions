import { showToast, Toast } from "@raycast/api";
import { ActionPanel, getPreferenceValues, List, getSelectedText } from "@raycast/api";
import { useCallback, useEffect, useMemo, useState } from "react";
import { PrimaryAction, PreferencesActionSection } from "./action/action";
import { runAppleScript } from "run-applescript";
import { ChatView } from "./view/question/chat";
import { Chat } from "./model/type";
import { v4 as uuidv4 } from "uuid";

export function useQuestion(props: { initialQuestion: string; disableAutoLoad?: boolean }): QuestionHook {
  const { initialQuestion, disableAutoLoad } = props;
  const [data, setData] = useState<string>(initialQuestion);
  const [isLoading, setLoading] = useState<boolean>(false);
  const [isAutoLoad] = useState<boolean>(() => {
    return getPreferenceValues<{
      isAutoLoad: boolean;
    }>().isAutoLoad;
  });

  useEffect(() => {
    (async () => {
      if (isAutoLoad && !disableAutoLoad) {
        setLoading(true);
        try {
          const selectedText = await getSelectedText();
          if (selectedText.length > 1) {
            setData(selectedText.trim());
            await showToast({
              style: Toast.Style.Success,
              title: "Selected text loaded!",
            });
          }
        } catch (error) {
          await showToast({
            style: Toast.Style.Failure,
            title: "Selected text couldn't load",
            message: String(error),
          });
        }
        setLoading(false);
      }
    })();
  }, []);

  const update = useCallback(
    async (question: string) => {
      setData(question);
    },
    [setData, data]
  );

  return useMemo(() => ({ data, isLoading, update }), [data, isLoading, update]);
}

type PromiseFunctionWithOneArg<T> = (arg: T) => Promise<void>;
interface BaseHook<T> {
  data: T;
  isLoading: boolean;
}

export type QuestionHook = BaseHook<string> & { update: PromiseFunctionWithOneArg<string> };

export const AnswerDetailView = (props: { markdown?: string | null | undefined }) => {
  const { markdown } = props;
  return <List.Item.Detail markdown={markdown} />;
};

export default function Command() {
  const [answer, setAnswer] = useState<string>("");
  const [error, setError] = useState<Error>();

  const [isNewConversation, setIsNewConversation] = useState<string | undefined>();

  useEffect(() => {
    console.log("第一次进来！！！");
    const now = new Date();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const day = String(now.getDate()).padStart(2, "0");
    const hours = String(now.getHours()).padStart(2, "0");
    const minutes = String(now.getMinutes()).padStart(2, "0");
    const seconds = String(now.getSeconds()).padStart(2, "0");

    const formattedDate = `${month}-${day} ${hours}:${minutes}:${seconds}`;
    console.log(formattedDate);
    setIsNewConversation(`来自Raycast | ${formattedDate}`);
  }, []);

  useEffect(() => {
    if (error) {
      showToast({
        style: Toast.Style.Failure,
        title: "Something went wrong",
        message: error.message,
      });
    }
  }, [error]);

  const [chats, setChats] = useState<Chat[]>([]);
  const [questing, setQuesting] = useState<boolean | undefined>();
  const question = useQuestion({ initialQuestion: "", disableAutoLoad: true });

  useEffect(() => {
    if (questing != null) {
      if (questing) {
        showToast({
          style: Toast.Style.Animated,
          title: "Charming is busy fetching...", //"莫斯拼命获取中...",
          message: "You can also go back to Charming to view details.", //"也可以返回主应用查看",
        });
      } else {
        showToast({
          style: Toast.Style.Success,
          title: "Fetched success", //"成功获取",
          message: "You can also go back to Charming to view details.", //"也可以返回主应用查看",
        });
      }
    }
  }, [questing]);

  useEffect(() => {
    if (question.data.length === 0) {
      setAnswer("");
      setChats((prev) => {
        if (prev.length === 0) {
          // 如果数组为空，返回原数组
          return prev;
        } else {
          // 如果数组不为空，返回除了最后一个元素的新数组
          const newChats = prev.slice(0, -1);
          return newChats;
        }
      });
    }
  }, [question.data]);

  const returnBlock = () => {
    console.log("回车");
    setQuesting(true);

    const chat: Chat = {
      id: uuidv4(),
      answer: "",
      question: question.data,
      created_at: new Date().toISOString(),
    };

    setChats((prev) => {
      return [...prev, chat];
    });

    runAppleScript(
      `tell application "CharmingMac" to save in "${question.data}" conversation "${isNewConversation}" `
    ).then((value) => {
      if (value.startsWith("[charming-error]")) {
        const content: string = value.split("[charming-error]")[1];
        console.log(content);
        const err = `💥${content}💥`;
        setError(new Error(`${err}`));
        setAnswer(`${err}`);
      } else {
        setAnswer(value);
      }
      console.log(`返回结果：${value}`);
      setQuesting(false);
    });
  };

  const getActionPanel = () => (
    <ActionPanel>
      <PrimaryAction title="Ask Charming" /*"询问莫斯"*/ onAction={returnBlock} />
      <PreferencesActionSection />
    </ActionPanel>
  );

  return (
    <List
      searchText={question.data}
      isShowingDetail={chats.length > 0 ? true : false}
      filtering={false}
      isLoading={questing} //answer.length === 0}
      onSearchTextChange={question.update}
      throttle={false}
      navigationTitle={"Ask"}
      actions={
        !question.data ? (
          <ActionPanel>
            <PreferencesActionSection />
          </ActionPanel>
        ) : (
          getActionPanel()
        )
      }
      searchBarPlaceholder={"Ask a question..."}
    >
      <ChatView data={chats} ques={question.data} ans={answer ?? ""} conve={isNewConversation ?? ""} />
    </List>
  );
}
