import { Icon } from "@raycast/api";

// Default values for openAi API call
export const DEFAULT_CONFIG = {
  temperature: 0.7, // Default temperature for GPT to keep it fairly creaive
  model: "gpt-4o", // Default model for the openai
  maxTokens: 1000, // Default max tokens for the openai
};

export const ICONS = [
  { title: "Dot", value: Icon.Dot },
  { title: "Reply", value: Icon.Reply },
  { title: "Document", value: Icon.Document },
  { title: "Question Mark", value: Icon.QuestionMark },
  { title: "Pencil", value: Icon.Pencil },
  { title: "Globe", value: Icon.Globe },
  { title: "Code", value: Icon.Code },
  { title: "Calendar", value: Icon.Calendar },
  { title: "Envelope", value: Icon.Envelope },
  { title: "Hammer", value: Icon.Hammer },
  { title: "Star", value: Icon.Star },
  { title: "Heart", value: Icon.Heart },
  { title: "Bolt", value: Icon.Bolt },
  { title: "Eye", value: Icon.Eye },
  { title: "MagnifyingGlass", value: Icon.MagnifyingGlass },
  { title: "Text", value: Icon.Text },
];
