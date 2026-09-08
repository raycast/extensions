import { CallType, createCallUrl } from "../api/links";

type Input = {
  /** Comma-separated Microsoft Entra user principal names or email addresses. Resolve names with Search Users first. */
  users: string;
  /** Whether the call should start as audio-only or with the caller's video enabled. */
  callType: "audio" | "video";
};

export default async function tool(input: Input) {
  const users = input.users.split(",").map((user) => user.trim());
  return {
    url: createCallUrl(users, input.callType === "video" ? CallType.Video : CallType.Audio),
    participants: users,
    callType: input.callType,
  };
}
