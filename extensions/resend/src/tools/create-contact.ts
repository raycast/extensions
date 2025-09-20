import { Tool } from "@raycast/api";
import { resend } from "../lib/resend";

type Input = {
  /**
   * The audience ID to add the contact to.
   */
  audienceId: string;
  /**
   * The first name of the contact.
   */
  firstName: string;
  /**
   * The last name of the contact.
   */
  lastName: string;
  /**
   * The email of the contact.
   */
  email: string;
  /**
   * The name of the audience.
   * This is used for confirmation purposes only.
   * You can get this from the list-audiences tool first.
   */
  audienceName: string;
};

/**
 * In order to create a contact, an audience ID is required.
 * If the user does not specify which audience to add the contact to,
 * you must ask the user to provide one.
 */
const tool = async (input: Input) => {
  return await resend.contacts.create({
    audienceId: input.audienceId,
    firstName: input.firstName,
    lastName: input.lastName,
    email: input.email,
  });
};

export const confirmation: Tool.Confirmation<Input> = async (input: Input) => {
  const infoItems = [];

  infoItems.push({ name: "Audience", value: input.audienceName });

  infoItems.push(
    { name: "First Name", value: input.firstName },
    { name: "Last Name", value: input.lastName },
    { name: "Email", value: input.email },
  );

  return {
    message: `New contact:`,
    info: infoItems,
  };
};

export default tool;
