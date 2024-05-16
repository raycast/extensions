import { Icon } from "@raycast/api";

export type Action = {
  id: string;
  title: string;
  description: string;
  icon: keyof typeof Icon;
  prompt: string;
};

const systemPrompt =
  "Act as an application. You should only output the result of the prompt. Do not include any additional information.";
const initialActions: Action[] = [
  {
    id: "1",
    title: "Summarize",
    description: "Summarize the text",
    icon: "Paragraph",
    prompt: `${systemPrompt}: Summarize the text in 1-2 sentences.`,
  },
  {
    id: "2",
    title: "Translate",
    description: "Translate the text",
    icon: "Globe",
    prompt: `${systemPrompt}: Translate the following text into French.`,
  },
  {
    id: "3",
    title: "Add Typescript to JS",
    description: "Add Typescript to the JS file",
    icon: "Code",
    prompt: `${systemPrompt}: Add Typescript to the following JS file.`,
  },
  {
    id: "4",
    title: "Correct Punctuation & Grammar",
    description: "Correct the punctuation and grammar",
    icon: "Pencil",
    prompt: `${systemPrompt}: Correct the punctuation and grammar in the following text.`,
  },
  {
    id: "5",
    title: "Generate Inline Documentation",
    description: "Generate documentation for the code",
    icon: "Book",
    prompt: `${systemPrompt}: Generate production-ready documentation to be placed above the following code.`,
  },
  {
    id: "6",
    title: "Code Review",
    description: "Review the code",
    icon: "EyeDropper",
    prompt: `${systemPrompt}: Review the following code and provide feedback.`,
  },
  {
    id: "7",
    title: "Generate Tests",
    description: "Generate tests for the code",
    icon: "Checkmark",
    prompt: `${systemPrompt}: Generate tests for the following code.`,
  },
  {
    id: "8",
    title: "Generate Email",
    description: "Generate a formal email",
    icon: "Envelope",
    prompt: `${systemPrompt}: Generate a formal email based on the following text.`,
  },
];

export default initialActions;
