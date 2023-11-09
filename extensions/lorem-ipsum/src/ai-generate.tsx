import { AI, showHUD } from "@raycast/api";
import { produceOutput } from "./utils";

export default async function AICommand(props?: {
  arguments: {
    topic: string;
  };
}) {
  const topic = props?.arguments.topic;

  const onSpecificTopic = topic !== undefined;

  const prompt = onSpecificTopic
    ? `Generate two paragraphs on the following topic: "${topic}"`
    : `Generate two paragraphs of text on some random topic that you choose.`;
  const notification = onSpecificTopic ? `Generating content on ${topic}...` : `Generating some random content...`;

  showHUD(notification);

  const response = await AI.ask(prompt);

  await produceOutput(response);
}
