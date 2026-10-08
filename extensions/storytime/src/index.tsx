import { Form, ActionPanel, Action, showToast, getPreferenceValues, Detail, Icon, Toast } from "@raycast/api";
import { useForm, FormValidation } from "@raycast/utils";
import fetch from "node-fetch";
import { useState } from "react";

interface Preferences {
  openai_api_key: string;
}

type Values = {
  type: string;
  theme: string;
  character: string;
  moral: string;
};

const storyTypes = {
  "children's": "Children's",
  horror: "Horror",
  romance: "Romance",
  "sci-fi": "Sci-Fi",
  thriller: "Thriller",
} as { [key: string]: string };

export default function Command() {
  const [story, setStory] = useState<string>("");
  const [values, setValues] = useState<object>({});
  const [loading, setLoading] = useState<boolean>(false);
  const { handleSubmit, itemProps } = useForm<Values>({
    async onSubmit(values) {
      if (loading) {
        return;
      }

      const preferences = getPreferenceValues<Preferences>();

      setLoading(true);
      setValues(values);

      await fetch("https://api.openai.com/v1/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${preferences.openai_api_key}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "text-davinci-003",
          prompt: `Write a ${values.type} about ${values.theme}, which has a main character who is ${values.character} with the moral of the story being ${values.moral}.`,
          max_tokens: 500,
          temperature: 0.75,
        }),
      })
        .then((response) => response.json())
        .then((data: any) => {
          if (data.error?.message) {
            showToast({
              style: Toast.Style.Failure,
              title: "Error generating story",
              message: data.error.message,
            });

            return;
          }

          setStory(data.choices[0].text);

          showToast({ title: "Story generated" });
        })
        .catch((error) => {
          showToast({
            style: Toast.Style.Failure,
            title: "Error generating story",
            message: error.message,
          });
        })
        .finally(() => setLoading(false));
    },
    validation: {
      theme: FormValidation.Required,
      character: FormValidation.Required,
      moral: FormValidation.Required,
    },
  });

  if (story.length > 0) {
    return <StoryView story={story} startAgain={() => setStory("")} values={values as Values} />;
  }

  return (
    <Form
      isLoading={loading}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Generate Story" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.Dropdown id="type" title="Story Type" placeholder="Select story type">
        {Object.keys(storyTypes).map((key: string, index: number) => (
          <Form.Dropdown.Item key={index} value={key} title={Object.values(storyTypes)[index]} />
        ))}
      </Form.Dropdown>
      <Form.TextField title="My Story Is About" placeholder="Two friends going on an adventure" {...itemProps.theme} />
      <Form.TextField title="My Main Character Is" placeholder="A dog named Spot" {...itemProps.character} />
      <Form.TextField title="The Moral of My Story Is" placeholder="To always be kind" {...itemProps.moral} />
    </Form>
  );
}

interface StoryView {
  story: string;
  startAgain: () => void;
  values: Values;
}

function StoryView(props: StoryView) {
  const { story, startAgain, values } = props;

  return (
    <Detail
      markdown={story}
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Label title="Type" text={storyTypes[values.type]} />
          <Detail.Metadata.Label title="Theme" text={values.theme} />
          <Detail.Metadata.Label title="Character" text={values.character} />
          <Detail.Metadata.Label title="Moral" text={values.moral} />
        </Detail.Metadata>
      }
      actions={
        <ActionPanel>
          <Action.CopyToClipboard title="Copy Story" content={story} />
          <Action title="Start Again" onAction={startAgain} icon={Icon.Redo} />
        </ActionPanel>
      }
    />
  );
}
