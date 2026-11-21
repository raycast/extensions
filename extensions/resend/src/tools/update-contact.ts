import { Tool } from "@raycast/api";
import { getResend, withResend } from "../lib/oauth";

type Input = {
  /**
   * Legacy audience ID used to scope the contact. Usually unnecessary.
   */
  audienceId?: string;

  /**
   * The ID of the contact to update.
   * This is required to identify which contact to update.
   * You can get this ID by using the list-contacts tool first.
   */
  contactId?: string;

  /**
   * The contact's current email address, used as an identifier when contactId is unavailable.
   */
  contactEmail?: string;

  /**
   * The first name of the contact. Use an empty string to clear it.
   */
  firstName?: string;

  /**
   * The last name of the contact. Use an empty string to clear it.
   */
  lastName?: string;

  /**
   * Unsubscribed status of the contact.
   * This is optional. If provided, it will update whether the contact is unsubscribed.
   */
  unsubscribed?: boolean;
};

const tool = async (input: Input) => {
  if (!input.contactId && !input.contactEmail) {
    throw new Error("Provide contactId or contactEmail to identify the contact");
  }
  if (input.firstName === undefined && input.lastName === undefined && input.unsubscribed === undefined) {
    throw new Error("Provide at least one contact field to update");
  }

  const resend = getResend();
  const { data, error } = await resend.contacts.update({
    ...(input.audienceId ? { audienceId: input.audienceId } : {}),
    ...(input.firstName !== undefined && { firstName: input.firstName }),
    ...(input.lastName !== undefined && { lastName: input.lastName }),
    ...(input.unsubscribed !== undefined && { unsubscribed: input.unsubscribed }),
    ...(input.contactId ? { id: input.contactId } : { email: input.contactEmail as string }),
  });

  if (error) {
    throw new Error(`Failed to update contact: ${error.message}`);
  }

  return data;
};

export const confirmation: Tool.Confirmation<Input> = async (input: Input) => {
  // Create an array of info items for the confirmation dialog
  const infoItems = [
    ...(input.audienceId ? [{ name: "Audience ID", value: input.audienceId }] : []),
    ...(input.contactId ? [{ name: "Contact ID", value: input.contactId }] : []),
    ...(input.contactEmail ? [{ name: "Contact Email", value: input.contactEmail }] : []),
  ];

  // Add optional fields to the info items if they are provided
  if (input.firstName !== undefined) infoItems.push({ name: "First Name", value: input.firstName });
  if (input.lastName !== undefined) infoItems.push({ name: "Last Name", value: input.lastName });
  if (input.unsubscribed !== undefined) infoItems.push({ name: "Unsubscribed", value: input.unsubscribed.toString() });

  return {
    title: "Update Contact",
    message: "Are you sure you want to update this contact with the provided information?",
    info: infoItems,
  };
};

export default withResend(tool);
