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
   * The ID of the contact to update.
   * This is required to identify which contact to update.
   * You can get this ID by using the list-contacts tool first.
   */
  contactId: string;

  /**
   * The first name of the contact.
   * This is optional. If provided, it will update the contact's first name.
   */
  firstName?: string;

  /**
   * The last name of the contact.
   * This is optional. If provided, it will update the contact's last name.
   */
  lastName?: string;

  /**
   * The email of the contact.
   * This is optional. If provided, it will update the contact's email.
   */
  email?: string;

  /**
   * Unsubscribed status of the contact.
   * This is optional. If provided, it will update whether the contact is unsubscribed.
   */
  unsubscribed?: boolean;
};

const tool = async (input: Input) => {
  const { data, error } = await resend.contacts.update({
    audienceId: input.audienceId,
    id: input.contactId,
    ...(input.firstName !== undefined && { firstName: input.firstName }),
    ...(input.lastName !== undefined && { lastName: input.lastName }),
    ...(input.email !== undefined && { email: input.email }),
    ...(input.unsubscribed !== undefined && { unsubscribed: input.unsubscribed }),
  });

  if (error) {
    throw new Error(`Failed to update contact: ${error.message}`);
  }

  return data;
};

export const confirmation: Tool.Confirmation<Input> = async (input: Input) => {
  // Create an array of info items for the confirmation dialog
  const infoItems = [
    { name: "Audience ID", value: input.audienceId },
    { name: "Contact ID", value: input.contactId },
  ];

  // Add optional fields to the info items if they are provided
  if (input.firstName !== undefined) infoItems.push({ name: "First Name", value: input.firstName });
  if (input.lastName !== undefined) infoItems.push({ name: "Last Name", value: input.lastName });
  if (input.email !== undefined) infoItems.push({ name: "Email", value: input.email });
  if (input.unsubscribed !== undefined) infoItems.push({ name: "Unsubscribed", value: input.unsubscribed.toString() });

  return {
    title: "Update Contact",
    message: "Are you sure you want to update this contact with the provided information?",
    info: infoItems,
  };
};

export default tool;
