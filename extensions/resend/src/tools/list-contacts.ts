import { resend } from "../lib/resend";

type Input = {
  /**
   * The ID of the audience to list contacts from.
   * You must get this ID by using the list-audiences tool first.
   */
  audienceId: string;
};

const tool = async (input: Input) => {
  const contacts = await resend.contacts.list({
    audienceId: input.audienceId,
  });
  return contacts;
};

export default tool;
