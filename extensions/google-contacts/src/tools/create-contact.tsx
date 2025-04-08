import { Tool } from "@raycast/api";
import * as google from "../api/oauth";
import { createContact } from "../api/endpoints";

// Define the input type for the create contact tool
type CreateContactInput = {
  /**
   * The first (given) name of the contact
   * @example "John"
   */
  firstName: string;

  /**
   * The last (family) name of the contact
   * @example "Smith"
   */
  lastName?: string;

  /**
   * The primary email address of the contact
   * @example "john.smith@example.com"
   */
  email?: string;

  /**
   * The primary phone number of the contact
   * @example "+1 555-123-4567"
   */
  phone?: string;

  /**
   * The contact's company or organization
   * @example "Acme Corporation"
   */
  company?: string;

  /**
   * The contact's job title or position
   * @example "Marketing Manager"
   */
  jobTitle?: string;

  /**
   * The contact's address
   * @example "123 Main St, Anytown, CA 94043"
   */
  address?: string;

  /**
   * The contact's birthday in DD.MM.YYYY format
   * @example "15.04.1985"
   */
  birthday?: string;

  /**
   * Any additional notes about the contact
   * @example "Met at 2023 conference, interested in our new product line"
   */
  notes?: string;
};

// Confirmation function to ask permission before creating contact
export const confirmation: Tool.Confirmation<CreateContactInput> = async (input) => {
  // Format full name for display
  const fullName = input.lastName ? `${input.firstName} ${input.lastName}` : input.firstName;

  // Create info items for confirmation dialog
  const infoItems = [
    {
      name: "Name",
      value: fullName,
    },
  ];

  // Add optional fields if provided
  if (input.email) infoItems.push({ name: "Email", value: input.email });
  if (input.phone) infoItems.push({ name: "Phone", value: input.phone });
  if (input.company) infoItems.push({ name: "Company", value: input.company });
  if (input.jobTitle) infoItems.push({ name: "Job Title", value: input.jobTitle });
  if (input.address) infoItems.push({ name: "Address", value: input.address });
  if (input.birthday) infoItems.push({ name: "Birthday", value: input.birthday });
  if (input.notes) infoItems.push({ name: "Notes", value: input.notes });

  return {
    message: `Create a new contact for "${fullName}"?`,
    info: infoItems,
  };
};

// The actual contact creation function
export default async function createContactTool(input: CreateContactInput): Promise<string> {
  try {
    // Authorize with Google
    await google.authorize();

    // Prepare data for contact creation
    const contactData: Record<string, unknown> = {};

    // Add name
    contactData.names = [
      {
        givenName: input.firstName,
        familyName: input.lastName || "",
      },
    ];

    // Add email if provided
    if (input.email) {
      contactData.emailAddresses = [
        {
          value: input.email,
          type: "home",
          metadata: { primary: true },
        },
      ];
    }

    // Add phone if provided
    if (input.phone) {
      contactData.phoneNumbers = [
        {
          value: input.phone,
          type: "mobile",
          metadata: { primary: true },
        },
      ];
    }

    // Add company and job title if provided
    if (input.company || input.jobTitle) {
      contactData.organizations = [
        {
          name: input.company || "",
          title: input.jobTitle || "",
        },
      ];
    }

    // Add address if provided
    if (input.address) {
      contactData.addresses = [
        {
          formattedValue: input.address,
          type: "home",
        },
      ];
    }

    // Add birthday if provided
    if (input.birthday) {
      // Parse birthday from DD.MM.YYYY format
      const parts = input.birthday.split(".");
      if (parts.length >= 2) {
        const birthdayData: {
          date: {
            day?: number;
            month?: number;
            year?: number;
          };
        } = {
          date: {
            day: parseInt(parts[0]),
            month: parseInt(parts[1]),
          },
        };

        // Add year if provided
        if (parts.length >= 3) {
          birthdayData.date.year = parseInt(parts[2]);
        }

        contactData.birthdays = [birthdayData];
      }
    }

    // Add notes if provided
    if (input.notes) {
      contactData.biographies = [
        {
          value: input.notes,
          contentType: "TEXT_PLAIN",
        },
      ];
    }

    // Create the contact
    await createContact(contactData);

    // Format full name for response
    const fullName = input.lastName ? `${input.firstName} ${input.lastName}` : input.firstName;

    // Return success message
    return (
      `Successfully created contact for ${fullName}.\n\n` +
      "Contact details:\n" +
      `- Name: ${fullName}\n` +
      (input.email ? `- Email: ${input.email}\n` : "") +
      (input.phone ? `- Phone: ${input.phone}\n` : "") +
      (input.company ? `- Company: ${input.company}\n` : "") +
      (input.jobTitle ? `- Job Title: ${input.jobTitle}\n` : "") +
      (input.address ? `- Address: ${input.address}\n` : "") +
      (input.birthday ? `- Birthday: ${input.birthday}\n` : "") +
      (input.notes ? `- Notes: ${input.notes}\n` : "")
    );
  } catch (error) {
    console.error("Error creating contact:", error);
    throw new Error(`Failed to create contact: ${error}`);
  }
}
