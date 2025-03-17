import { Resend } from "resend";
import { API_KEY } from "../utils/constants";
import "cross-fetch/polyfill";

const resend = new Resend(API_KEY);

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
