import { useEffect } from "react";
import { Form, showToast, Clipboard, ActionPanel, Icon, Action, closeMainWindow, popToRoot } from "@raycast/api";

type Values = {
  searchQuery: string;
};

export default function Command(props: { arguments?: { generate?: string } }) {
  const initialSearchQuery = props.arguments?.generate ?? "";
  const placeholders = [
    "How to tie a 👔",
    "Best 🍕 place near me",
    "What's the capital of 🇫🇷",
    "How to bake a 🎂",
    "How to train a 😺",
    "Why is the sky 🟦",
    "How to 🔧 a flat tire",
  ];
  const placeholder = placeholders[Math.floor(Math.random() * placeholders.length)];

  function handleSubmit(values: Values) {
    const searchQuery = values.searchQuery.trim().replace(/ /g, "+");
    if (!searchQuery) {
      showToast({ title: "Error", message: "Please enter a search query" });
      return;
    }
    showToast({ title: "Copied Link:", message: `"${searchQuery}"` });
    Clipboard.copy(`http://letmegooglethat.com/?q=${searchQuery}`);
  }

  useEffect(() => {
    if (props.arguments?.generate) {
      handleSubmit({ searchQuery: props.arguments.generate });
      popToRoot();
    }
  }, [props.arguments]);

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm icon={Icon.MagnifyingGlass} title="Generate Link" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.Description text="Generate a LetMeGoogleThat link For:" />
      <Form.TextField id="searchQuery" placeholder={placeholder} defaultValue={initialSearchQuery} />
    </Form>
  );
}
