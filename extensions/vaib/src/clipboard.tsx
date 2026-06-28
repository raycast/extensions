import { Clipboard, Action, ActionPanel, List, useNavigation, Icon } from "@raycast/api";
import { useEffect, useState } from "react";
import Answer from "./components/Answer";

const items: {
  title: string;
  value: string;
  icon?: Icon;
}[] = [
  { title: "Explain", value: "Explain the following content in detail: \n", icon: Icon.List },
  { title: "Make Shorter", value: "Make the following content shorter: \n", icon: Icon.ShortParagraph },
  { title: "Make Longer", value: "Make the following content longer: \n", icon: Icon.AddPerson },
  {
    title: "Change Tone to Professional",
    value: "Make the following content more professional: \n",
    icon: Icon.Building,
  },
  { title: "Change Tone to Friendly", value: "Make the following content more friendly: \n", icon: Icon.Person },
  { title: "Rephrase", value: "Rephrase the following content: \n", icon: Icon.Repeat },
  { title: "Translate to English", value: "Translate the following content to English: \n", icon: Icon.Globe },
  { title: "Translate to Hindi", value: "Translate the following content to Hindi: \n", icon: Icon.Globe },
  {
    title: "Fix spelling and grammar",
    value: "Fix the spelling and grammar of the following content: \n",
    icon: Icon.Check,
  },
  { title: "Add comments to code", value: "Add comments to the following code: \n", icon: Icon.CodeBlock },
  { title: "Generate code", value: "Generate code for the following task: \n", icon: Icon.Code },
];

export default function Command() {
  const [question, setQuestion] = useState("");
  const { push } = useNavigation();

  useEffect(() => {
    Clipboard.readText().then((text) => {
      setQuestion(text as string);
    });
  }, []);

  return (
    <List navigationTitle="Choose options" searchBarPlaceholder="What to do with clipboard text?">
      {items.map((item) => (
        <List.Item
          key={item.title}
          title={item.title}
          icon={item?.icon}
          actions={
            <ActionPanel>
              <Action title="Select" onAction={() => push(<Answer question={item.value + question} />)} />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
