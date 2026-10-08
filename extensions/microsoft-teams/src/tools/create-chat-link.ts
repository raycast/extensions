import { createChatUrl } from "../api/links";

type Input = {
  /** Comma-separated Microsoft Entra user principal names or email addresses. Resolve names with Search Users first. */
  users: string;
  /** Optional group-chat title. Use only for chats with at least two other users. */
  topic?: string;
  /** Optional text to place in the compose box. This does not send the message. */
  message?: string;
};

export default async function tool(input: Input) {
  const users = input.users.split(",").map((user) => user.trim());
  return {
    url: createChatUrl(users, { topic: input.topic, message: input.message }),
    participants: users,
    messageIsDraft: Boolean(input.message),
  };
}
