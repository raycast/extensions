import { Action, ActionPanel, Detail, Form, useNavigation } from "@raycast/api";
import OpenAI from "openai";
import { useState } from "react";

export default function Command() {
  const [loading, setLoading] = useState<boolean>(false);
  const { push } = useNavigation();

  return (
    <Form
      isLoading={loading}
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Submit"
            onSubmit={(values) => {
              if (loading) return;
              setLoading(true);
              const model = values.model as string;
              ask(values.question, model)
                .then((answer) => {
                  setLoading(false);

                  // Push answer detail view
                  push(<AnswerDetail answer={answer} />);
                })
                .catch(() => {
                  setLoading(false);

                  push(<Detail markdown="Failed to get answer." />);
                });
            }}
          />
        </ActionPanel>
      }
    >
      <Form.Dropdown
        id="model"
        title="Model"
        defaultValue="step-1-8k"
        storeValue={true}
      >
        {
          [
            "step-1-8k",
            "step-1-32k",
            "step-1-128k",
            "step-1-256k",
            "step-1v-8k",
            "step-1v-32k",
            "step-2-16k-nightly",
          ].map((model) => (
            <Form.Dropdown.Item value={model} title={model} />
          ))
        }
      </Form.Dropdown>
      <Form.TextArea id="question" title="Question" placeholder="Input question here, then submit with command+enter" autoFocus={true} />
    </Form>
  );
}

const openai = new OpenAI({
  apiKey: "4AqjTuCzlYyl6rzqPY4lMIK5ZeMRL6DKne9nMHhMNtunfyrHueUttz2lKKe5IfJ0h",
  baseURL: "https://api.stepfun.com/v1",
});

async function ask(question: string, model: string): Promise<string> {
  console.log("Q >>>>> ", question);

  const completion = await openai.chat.completions.create({
    model: model,
    messages: [
      {
        role: "system",
        content:
          "你是由阶跃星辰提供的AI聊天助手，你擅长中文，英文，以及多种其他语言的对话。在保证用户数据安全的前提下，你能对用户的问题和请求，作出快速和精准的回答。同时，你的回答和建议应该拒绝黄赌毒，暴力恐怖主义的内容",
      },
      {
        role: "user",
        content: question,
      },
    ],
  });

  const answer = JSON.stringify(completion);

  console.log("A <<<<< ", answer);

  return Promise.resolve(completion.choices[0].message.content ?? "Failed");
}

// Show answer as markdown with detail view
export function AnswerDetail({ answer }: { answer: string }) {
  return <Detail markdown={answer} />;
}
