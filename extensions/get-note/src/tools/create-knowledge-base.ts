import { Tool } from "@raycast/api";

import { createKnowledgeBase } from "../lib/api";

type Input = {
  /**
   * The name of the new knowledge base.
   */
  name: string;
  /**
   * Optional description of the knowledge base.
   */
  description?: string;
  /**
   * Optional cover URL of the knowledge base.
   */
  cover?: string;
};

export default async function createKnowledgeBaseTool(input: Input) {
  const topic = await createKnowledgeBase(input);

  return {
    topicId: topic.topic_id,
    name: topic.name,
    description: topic.description,
    cover: topic.cover,
    createdAt: topic.created_at,
  };
}

export const confirmation: Tool.Confirmation<Input> = async (input) => {
  return {
    message: "Create this knowledge base?",
    info: [
      { name: "Name", value: input.name },
      { name: "Description", value: input.description || "" },
      { name: "Cover", value: input.cover || "" },
    ],
  };
};
