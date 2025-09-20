import { client, getJwt } from "./lemmy";

export const getReplies = async () => {
  const replies = await client.getReplies({
    auth: await getJwt(),
    unread_only: true,
  });

  return replies.replies;
};
