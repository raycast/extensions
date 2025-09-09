import { Tool } from "@raycast/api";
import { resend } from "../lib/resend";

type Input = {
  /**
   * The ID of the audience that contains the contact.
   * This is required to identify which audience the contact belongs to.
   * You can get this ID by using the list-audiences tool first.
   */
  audienceId: string;

  /**
   * The name of the audience.
   * This is used for confirmation purposes only.
   * You can get this from the list-audiences tool first.
   */
  audienceName: string;

  /**
   * The ID of the contact to remove.
   * This is required to identify which contact to delete.
   * You can get this ID by using the list-contacts tool first.
   */
  contactId: string;

  /**
   * The email of the contact to remove.
   * This is used for confirmation purposes only.
   * You can get this email by using the list-contacts tool first.
   */
  contactEmail: string;

  /**
   * The first name of the contact to remove.
   * This is used for confirmation purposes only.
   * You can get this from the list-contacts tool first.
   */
  contactFirstName?: string;

  /**
   * The last name of the contact to remove.
   * This is used for confirmation purposes only.
   * You can get this from the list-contacts tool first.
   */
  contactLastName?: string;
};

/**
 * In order to remove a contact, an audience ID is required.
 * If a contact exists in multiple audiences, you must ask the user to specify which audience to remove the contact from. But only asks for the audiences that the contact is in. You must first get the list of audiences that the contact is in using the list-contacts tool.
 */
const tool = async (input: Input) => {
  const { data, error } = await resend.contacts.remove({
    audienceId: input.audienceId,
    id: input.contactId,
  });

  if (error) {
    throw new Error(`Failed to remove contact: ${error.message}`);
  }

  return data;
};

export const confirmation: Tool.Confirmation<Input> = async (input: Input) => {
  const infoItems = [];

  infoItems.push({ name: "Audience", value: input.audienceName });

  if (input.contactFirstName) {
    infoItems.push({ name: "First Name", value: input.contactFirstName });
  }

  if (input.contactLastName) {
    infoItems.push({ name: "Last Name", value: input.contactLastName });
  }

  infoItems.push({ name: "Contact Email", value: input.contactEmail });

  return {
    title: "Remove Contact",
    message: "Are you sure you want to remove this contact? This action cannot be undone.",
    info: infoItems,
  };
};

export default tool;
