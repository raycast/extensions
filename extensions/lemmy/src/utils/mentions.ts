import { client, getJwt } from "./lemmy";

export const getMentions = async () => {
  const mentions = await client.getPersonMentions({
    auth: await getJwt(),
    unread_only: true,
  });

  return mentions.mentions;
};
