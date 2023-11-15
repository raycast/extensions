import { AI, showHUD, showToast, Toast } from "@raycast/api";
import { produceOutput } from "./utils";

function constructPrompt(topic: string | undefined) {
  const prompt = `
    You are a text generation robot. You are only capable of outputting a series of paragraphs.
    The only separation between the paragraphs you produce is a blank line.
    
    You will either be writing about a topic I tell you to, or pick one at random.

    Do not write in first person.
    Do not explain what topic you are writing about.
    Use brief and concise language, with a casual tone.

    Generate three short paragraphs. The topic is "${topic}".
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
