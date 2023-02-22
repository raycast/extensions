import {
  Action,
  openExtensionPreferences,
  ActionPanel,
  getPreferenceValues,
  Form,
  Icon,
  showToast,
  Toast,
} from "@raycast/api";
import { Configuration, OpenAIApi } from "openai";
import { useEffect, useRef, useState } from "react";
import { useCachedState, useForm, usePromise } from "@raycast/utils";
import { getPageContent } from "../utils/api";
import { renderContent } from "../utils/string";
import { ChangeLanguageSubmenu } from "./change-language-submenu";

const preferences = getPreferenceValues();

const configuration = new Configuration({
  apiKey: preferences.openAIKey,
});

const openai = new OpenAIApi(configuration);

export default function AskQuestionPage({ title }: { title: string }) {
  const [language] = useCachedState("language", "en");
  const { data: content, isLoading: isLoadingContent } = usePromise(getPageContent, [title, language]);
  const [isAnswering, setIsAnswering] = useState(false);
  const [answer, setAnswer] = useState("");
  const [placeholder, setPlaceholder] = useState("Ask a question...");
  const [prompt, setPrompt] = useState("");
  const interruptId = useRef(0);

  useEffect(() => {
    if (content) {
      setPrompt(`# ${title}\n\n${renderContent(content, 2, [], language)}\n\n---`);
    }
  }, [title, content, language]);

  const { handleSubmit, itemProps, setValue } = useForm({
    onSubmit: async ({ question }) => {
      interruptId.current += 1;

      if (!preferences.openAIKey) {
        showToast({
          title: "Missing OpenAI key",
          message: "Set your key in the extension preferences.",
          style: Toast.Style.Failure,
          primaryAction: {
            title: "Open Preferences",
            onAction: () => openExtensionPreferences(),
          },
        });
        return;
      }

      if (isAnswering) {
        setAnswer("");
      }

      setValue("question", "");
      setIsAnswering(true);
      setImmediate(() => setPlaceholder(question));

      const newPrompt = `${prompt.slice(0, 3800)}\n\nQ: ${question}\nA:`;

      const completion = await openai.createCompletion(
        {
          model: "text-davinci-003",
          prompt: newPrompt,
          max_tokens: 200,
          stream: true,
        },
        { responseType: "stream" }
      );

      setPrompt(newPrompt);
      setAnswer("");

      const id = interruptId.current;
      let answer = "";
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      completion.data.on("data", (data: any) => {
        if (id !== interruptId.current) {
          return;
        }

        const lines = data
          .toString()
          .split("\n")
          .filter((line: string) => line.trim() !== "");
        for (const line of lines) {
          const message = line.replace(/^data: /, "");
          if (message === "[DONE]") {
            setIsAnswering(false);
            setPrompt(newPrompt + answer);
            return;
          }
          const parsed = JSON.parse(message);
          answer += parsed.choices[0].text;
          setAnswer(answer);
        }
      });
    },
    validation: {
      question: (value) => {
        if (!value || value.length < 1) {
          return "Question is required";
        }
      },
    },
  });

  return (
    <Form
      navigationTitle={title}
      isLoading={isAnswering || isLoadingContent}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Ask Question" icon={Icon.QuestionMarkCircle} onSubmit={handleSubmit} />
          <ActionPanel.Section>
            <Action.CopyToClipboard
              title="Copy Answer"
              content={answer.trim()}
              shortcut={{
                modifiers: ["cmd"],
                key: ".",
              }}
            />
            <Action.CopyToClipboard
              title="Copy Question"
              content={placeholder}
              shortcut={{
                modifiers: ["cmd"],
                key: ",",
              }}
            />
          </ActionPanel.Section>
          <ActionPanel.Section>
            <ChangeLanguageSubmenu title={title} />
          </ActionPanel.Section>
        </ActionPanel>
      }
    >
      <Form.TextField
        autoFocus
        title="Question"
        info="Previous answers will be used to generate the new answer."
        {...itemProps.question}
        placeholder={placeholder}
      />
      <Form.Description text={answer.trim()} />
    </Form>
  );
}
