import { Tool } from "@raycast/api";
import { Resend } from "resend";
import { API_KEY } from "../utils/constants";

const resend = new Resend(API_KEY);

type Input = {
  /**
   * The recipient of the email.
   * This field is required.
   */
  to: string[];
  /**
   * The content of the email as HTML.
   * Make sure the content is short and concise.
   * Don't include any introduction or salutation. Just the main content.
   */
  content: string;
  /**
   * The subject of the email.
   * Make sure it's short and concise.
   */
  subject?: string;
};

const tool = async (input: Input) => {
  const { error } = await resend.emails.send({
    from: "Pedro Duarte <oi@ped.ro>",
    to: input.to,
    subject: `Quickmail ${input.subject ? `→ ${input.subject}` : ""}`,
    html: input.content,
  });

  if (error) {
    return console.error({ error });
  }
};

export const confirmation: Tool.Confirmation<Input> = async (input: Input) => {
  return {
    info: [
      {
        name: "To",
        value: input.to.join(", "),
      },
      {
        name: "Subject",
        value: input.subject,
      },
      {
        name: "Content",
        value: input.content,
      },
    ],
  };
};

export default tool;
