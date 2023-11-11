import { AI, showHUD, showToast, Toast } from "@raycast/api";
import { produceOutput } from "./utils";

export default async function AICommand(props?: {
  arguments: {
    topic: string;
  };
}) {
  const topic = props?.arguments.topic;
  const isRandom = topic === "";

  const action = isRandom
    ? `Generate two paragraphs of text on some random topic that you choose.`
    : `Generate two paragraphs on the following topic: "${topic}"`;
  const rules = `Make sure all sentences are complete. Add a blank between each paragraph.`;
  const prompt = `${action}\n${rules}`;

  console.log({
    topic,
    isRandom,
  });

  const notification = isRandom ? `Generating some random content...` : `Generating content on "${topic}"...`;

  await showToast({
    title: notification,
  });

  const response = await AI.ask(prompt);

  await produceOutput(response);
}
