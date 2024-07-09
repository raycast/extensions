import { AI, environment, LaunchProps, showToast, Toast } from "@raycast/api";
import { showError, produceOutput } from "./utils";

function constructPrompt(topic: string | undefined) {
  const topicInstructions = topic
    ? `The topic you should write about is "${topic}".`
    : `Pick a completely random topic to write about. Just make sure all paragraphs are about that topic.`;
  return `
    You are only capable of outputting a series of paragraphs. What follows is a set of rules I'd like you to adhere to:
    - separate paragraphs with a blank line, nothing else
    - do not write in first person
    - do not explain what topic you are writing about
    - use brief and concise language, with a casual tone

    Generate between two and five short paragraphs. ${topicInstructions}
  `;
}

export default async function AICommand(props?: LaunchProps<{ arguments: Arguments.AiGenerate }>) {
  if (!environment.canAccess(AI)) {
    await showError("You don't have access to AI.");
    return;
  }

  const topic = props?.arguments.topic || undefined;
  const isRandom = topic === undefined;

  const prompt = constructPrompt(topic);

  const notification = isRandom ? `Generating some random content...` : `Generating content on "${topic}"...`;

  await showToast(Toast.Style.Animated, notification);

  const response = await AI.ask(prompt, {
    model: "gpt-3.5-turbo",
    creativity: "none",
  });
  const output = response.trim();

  await produceOutput(output);
}
