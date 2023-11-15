import { AI, showHUD, showToast, Toast } from "@raycast/api";
import { produceOutput } from "./utils";

function constructPrompt(topic: string | undefined) {
  const topicInstructions = topic ? `The topic is "${topic}".` : `Pick any topic you like completely at random.`;
  const prompt = `
    You are a text generation robot. You are only capable of outputting a series of paragraphs.
    
    What follows is a set of rules I'd like you to adhere to:
    - separate paragraphs with a blank line, nothing else
    - do not write in first person
    - do not explain what topic you are writing about
    - use brief and concise language, with a casual tone

    Generate three short paragraphs. ${topicInstructions}
  `;

  return prompt;
}

export default async function AICommand(props?: {
  arguments: {
    topic: string;
  };
}) {
  const topic = props?.arguments.topic || undefined;
  const isRandom = topic === undefined;

  const prompt = constructPrompt(topic);

  const notification = isRandom ? `Generating some random content...` : `Generating content on "${topic}"...`;

  void showToast({
    title: notification,
  });

  const response = await AI.ask(prompt);
  const output = response.trim();

  await produceOutput(output);
}
