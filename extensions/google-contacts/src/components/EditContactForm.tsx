import React from "react";
import { Action, ActionPanel, Form, useNavigation, showToast, Toast, Icon } from "@raycast/api";
import { useState } from "react";
import { Contact } from "../types";
import { updateContact } from "../api/endpoints";

interface EditContactFormProps {
  contact: Contact;
}

export default function EditContactForm({ contact }: EditContactFormProps) {
  const { pop } = useNavigation();
  const [isLoading, setIsLoading] = useState(false);

  // Get existing data from the contact
  const nameToEdit = contact.names && contact.names.length > 0 ? contact.names[0] : undefined;
  const emailsToEdit = contact.emailAddresses || [];
  const phonesToEdit = contact.phoneNumbers || [];
  const orgToEdit = contact.organizations && contact.organizations.length > 0 ? contact.organizations[0] : undefined;
  const bioToEdit = contact.biographies && contact.biographies.length > 0 ? contact.biographies[0] : undefined;
  const addressToEdit = contact.addresses && contact.addresses.length > 0 ? contact.addresses[0] : undefined;
  const birthdayToEdit = contact.birthdays && contact.birthdays.length > 0 ? contact.birthdays[0] : undefined;
  const websiteToEdit = contact.urls && contact.urls.length > 0 ? contact.urls[0] : undefined;
  const customFieldsToEdit = contact.userDefined || [];

  // Determine which sections to show based on existing data
  const [showMoreEmails] = useState(emailsToEdit.length > 1);
  const [showMorePhones] = useState(phonesToEdit.length > 1);
  const [showOrganizationDetails] = useState(orgToEdit?.department || orgToEdit?.jobDescription);
  const [showAddressFields] = useState(!!addressToEdit);
  const [showCustomFields] = useState(customFieldsToEdit.length > 0);

  // Parse birthday data for form fields
  const birthdayDay = birthdayToEdit?.date?.day?.toString() || "";
  const birthdayMonth = birthdayToEdit?.date?.month?.toString() || "";
  const birthdayYear = birthdayToEdit?.date?.year?.toString() || "";

  async function handleSubmit(values: Record<string, unknown>) {
    setIsLoading(true);

    try {
      // Prepare data for update
      const updateData: Record<string, unknown> = {};
      const updateFields: string[] = [];

      // Update name if changed
      if (
        values.givenName !== (nameToEdit?.givenName || "") ||
        values.familyName !== (nameToEdit?.familyName || "") ||
        values.middleName !== (nameToEdit?.middleName || "") ||
        values.prefix !== (nameToEdit?.honorificPrefix || "") ||
        values.suffix !== (nameToEdit?.honorificSuffix || "")
      ) {
        updateData.names = [
          {
            givenName: values.givenName,
            familyName: values.familyName,
            middleName: values.middleName,
            honorificPrefix: values.prefix,
            honorificSuffix: values.suffix,
          },
        ];
        updateFields.push("names");
      }

      // Update emails if changed
      const primaryEmail = emailsToEdit.find((e) => e.metadata?.primary) || emailsToEdit[0] || {};
      const secondaryEmail = emailsToEdit[1] || {};
      const tertiaryEmail = emailsToEdit[2] || {};

      if (
        values.primaryEmail !== (primaryEmail.value || "") ||
        values.primaryEmailType !== (primaryEmail.type || "home") ||
        values.email2 !== (secondaryEmail.value || "") ||
        values.email2Type !== (secondaryEmail.type || "work") ||
        values.email3 !== (tertiaryEmail.value || "") ||
        values.email3Type !== (tertiaryEmail.type || "other")
      ) {
        const emails = [];
        if (values.primaryEmail) {
          emails.push({
            value: values.primaryEmail,
            type: values.primaryEmailType || "home",
            metadata: { primary: true },
          });
        }
        if (values.email2) {
          emails.push({
            value: values.email2,
            type: values.email2Type || "work",
          });
        }
        if (values.email3) {
          emails.push({
            value: values.email3,
            type: values.email3Type || "other",
          });
        }
        if (emails.length > 0) {
          updateData.emailAddresses = emails;
          updateFields.push("emailAddresses");
        }
      }

      // Update phones if changed
      const primaryPhone = phonesToEdit.find((p) => p.metadata?.primary) || phonesToEdit[0] || {};
      const secondaryPhone = phonesToEdit[1] || {};
      const tertiaryPhone = phonesToEdit[2] || {};

      if (
        values.primaryPhone !== (primaryPhone.value || "") ||
        values.primaryPhoneType !== (primaryPhone.type || "mobile") ||
        values.phone2 !== (secondaryPhone.value || "") ||
        values.phone2Type !== (secondaryPhone.type || "home") ||
        values.phone3 !== (tertiaryPhone.value || "") ||
        values.phone3Type !== (tertiaryPhone.type || "work")
      ) {
        const phones = [];
        if (values.primaryPhone) {
          phones.push({
            value: values.primaryPhone,
            type: values.primaryPhoneType || "mobile",
            metadata: { primary: true },
          });
        }
        if (values.phone2) {
          phones.push({
            value: values.phone2,
            type: values.phone2Type || "home",
          });
        }
        if (values.phone3) {
          phones.push({
            value: values.phone3,
            type: values.phone3Type || "work",
          });
        }
        if (phones.length > 0) {
          updateData.phoneNumbers = phones;
          updateFields.push("phoneNumbers");
        }
      }

      // Update organization if changed
      if (
        values.company !== (orgToEdit?.name || "") ||
        values.jobTitle !== (orgToEdit?.title || "") ||
        values.department !== (orgToEdit?.department || "") ||
        values.jobDescription !== (orgToEdit?.jobDescription || "")
      ) {
        updateData.organizations = [
          {
            name: values.company,
            title: values.jobTitle,
            department: values.department,
            jobDescription: values.jobDescription,
          },
        ];
        updateFields.push("organizations");
      }

      // Update address if changed
      if (
        values.addressStreet !== (addressToEdit?.streetAddress || "") ||
        values.addressExtended !== (addressToEdit?.extendedAddress || "") ||
        values.addressCity !== (addressToEdit?.city || "") ||
        values.addressRegion !== (addressToEdit?.region || "") ||
        values.addressPostal !== (addressToEdit?.postalCode || "") ||
        values.addressCountry !== (addressToEdit?.country || "") ||
        values.addressType !== (addressToEdit?.type || "home")
      ) {
        if (
          values.addressStreet ||
          values.addressCity ||
          values.addressRegion ||
          values.addressPostal ||
          values.addressCountry
        ) {
          updateData.addresses = [
            {
              streetAddress: values.addressStreet,
              extendedAddress: values.addressExtended,
              city: values.addressCity,
              region: values.addressRegion,
              postalCode: values.addressPostal,
              country: values.addressCountry,
              type: values.addressType || "home",
            },
          ];
          updateFields.push("addresses");
        }
      }

      // Update birthday if changed
      if (
        values.birthdayDay !== birthdayDay ||
        values.birthdayMonth !== birthdayMonth ||
        values.birthdayYear !== birthdayYear
      ) {
        if (values.birthdayDay || values.birthdayMonth) {
          const birthdayData: {
            date: {
              day?: number;
              month?: number;
              year?: number;
            };
          } = {
            date: {},
          };

          if (values.birthdayDay) {
            birthdayData.date.day = parseInt(String(values.birthdayDay));
          }
          if (values.birthdayMonth) {
            birthdayData.date.month = parseInt(String(values.birthdayMonth));
          }
          if (values.birthdayYear) {
            birthdayData.date.year = parseInt(String(values.birthdayYear));
          }

          updateData.birthdays = [birthdayData];
          updateFields.push("birthdays");
        }
      }

      // Update website if changed
      if (values.website !== (websiteToEdit?.value || "") || values.websiteType !== (websiteToEdit?.type || "home")) {
        if (values.website) {
          updateData.urls = [
            {
              value: values.website,
              type: values.websiteType || "home",
            },
          ];
          updateFields.push("urls");
        }
      }

      // Update custom fields if changed
      const customField1 = customFieldsToEdit[0] || {};
      const customField2 = customFieldsToEdit[1] || {};

      if (
        values.customLabel1 !== (customField1.key || "") ||
        values.customValue1 !== (customField1.value || "") ||
        values.customLabel2 !== (customField2.key || "") ||
        values.customValue2 !== (customField2.value || "")
      ) {
        const userDefined = [];
        if (values.customLabel1 && values.customValue1) {
          userDefined.push({
            key: values.customLabel1,
            value: values.customValue1,
          });
        }
        if (values.customLabel2 && values.customValue2) {
          userDefined.push({
            key: values.customLabel2,
            value: values.customValue2,
          });
        }
        if (userDefined.length > 0) {
          updateData.userDefined = userDefined;
          updateFields.push("userDefined");
        }
      }

      // Update notes if changed
      if (values.notes !== (bioToEdit?.value || "")) {
        if (values.notes) {
          updateData.biographies = [
            {
              value: values.notes,
              contentType: "TEXT_PLAIN",
            },
          ];
          updateFields.push("biographies");
        }
      }

      if (updateFields.length > 0) {
        await updateContact(contact.resourceName, updateData, updateFields.join(","));

        showToast({
          style: Toast.Style.Success,
          title: "Contact updated",
        });

        pop();
      } else {
        showToast({
          style: Toast.Style.Failure,
          title: "No changes to save",
        });
      }
    } catch (error) {
      console.error("Error updating contact:", error);

      // Provide a more user-friendly error message
      let errorMessage = "An unknown error occurred";
      if (error instanceof Error) {
        errorMessage = error.message;
      }

      showToast({
        style: Toast.Style.Failure,
        title: "Failed to update contact",
        message: errorMessage,
      });
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Form
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm onSubmit={handleSubmit} title="Update Contact" />
        </ActionPanel>
      }
    >
      {/* Name section */}
      <Form.Description title="Name" text="Contact's name information" />
      <Form.TextField
        id="givenName"
        title="First Name"
        placeholder="First Name"
        defaultValue={nameToEdit?.givenName || ""}
      />
      <Form.TextField
        id="middleName"
        title="Middle Name"
        placeholder="Middle Name"
        defaultValue={nameToEdit?.middleName || ""}
      />
      <Form.TextField
        id="familyName"
        title="Last Name"
        placeholder="Last Name"
        defaultValue={nameToEdit?.familyName || ""}
      />
      <Form.TextField
        id="prefix"
        title="Prefix"
        placeholder="Mr., Mrs., Dr., etc."
        defaultValue={nameToEdit?.honorificPrefix || ""}
      />
      <Form.TextField
        id="suffix"
        title="Suffix"
        placeholder="Jr., Sr., M.D., etc."
        defaultValue={nameToEdit?.honorificSuffix || ""}
      />

      {/* Email section */}
      <Form.Separator />
      <Form.Description title="Email Addresses" text="Contact's email information" />

      {/* Primary email */}
      <Form.TextField
        id="primaryEmail"
        title="Primary Email"
        placeholder="Primary Email Address"
        defaultValue={emailsToEdit.find((e) => e.metadata?.primary)?.value || emailsToEdit[0]?.value || ""}
      />
      <Form.Dropdown
        id="primaryEmailType"
        title="Type"
        defaultValue={emailsToEdit.find((e) => e.metadata?.primary)?.type || emailsToEdit[0]?.type || "home"}
      >
        <Form.Dropdown.Item value="home" title="Home" icon={Icon.House} />
        <Form.Dropdown.Item value="work" title="Work" icon={Icon.Desktop} />
        <Form.Dropdown.Item value="other" title="Other" icon={Icon.Envelope} />
      </Form.Dropdown>

      {/* Secondary and tertiary emails if they exist */}
      {showMoreEmails && (
        <>
          <Form.TextField
            id="email2"
            title="Secondary Email"
            placeholder="Secondary Email Address"
            defaultValue={emailsToEdit[1]?.value || ""}
          />
          <Form.Dropdown id="email2Type" title="Type" defaultValue={emailsToEdit[1]?.type || "work"}>
            <Form.Dropdown.Item value="home" title="Home" icon={Icon.House} />
            <Form.Dropdown.Item value="work" title="Work" icon={Icon.Desktop} />
            <Form.Dropdown.Item value="other" title="Other" icon={Icon.Envelope} />
          </Form.Dropdown>

          {emailsToEdit.length > 2 && (
            <>
              <Form.TextField
                id="email3"
                title="Additional Email"
                placeholder="Additional Email Address"
                defaultValue={emailsToEdit[2]?.value || ""}
              />
              <Form.Dropdown id="email3Type" title="Type" defaultValue={emailsToEdit[2]?.type || "other"}>
                <Form.Dropdown.Item value="home" title="Home" icon={Icon.House} />
                <Form.Dropdown.Item value="work" title="Work" icon={Icon.Desktop} />
                <Form.Dropdown.Item value="other" title="Other" icon={Icon.Envelope} />
              </Form.Dropdown>
            </>
          )}
        </>
      )}

      {/* Phone section */}
      <Form.Separator />
      <Form.Description title="Phone Numbers" text="Contact's phone information" />

      {/* Primary phone */}
      <Form.TextField
        id="primaryPhone"
        title="Primary Phone"
        placeholder="Primary Phone Number"
        defaultValue={phonesToEdit.find((p) => p.metadata?.primary)?.value || phonesToEdit[0]?.value || ""}
      />
      <Form.Dropdown
        id="primaryPhoneType"
        title="Type"
        defaultValue={phonesToEdit.find((p) => p.metadata?.primary)?.type || phonesToEdit[0]?.type || "mobile"}
      >
        <Form.Dropdown.Item value="mobile" title="Mobile" icon={Icon.Mobile} />
        <Form.Dropdown.Item value="home" title="Home" icon={Icon.House} />
        <Form.Dropdown.Item value="work" title="Work" icon={Icon.Desktop} />
        <Form.Dropdown.Item value="main" title="Main" icon={Icon.Phone} />
        <Form.Dropdown.Item value="other" title="Other" icon={Icon.Phone} />
      </Form.Dropdown>

      {/* Secondary and tertiary phones if they exist */}
      {showMorePhones && (
        <>
          <Form.TextField
            id="phone2"
            title="Secondary Phone"
            placeholder="Secondary Phone Number"
            defaultValue={phonesToEdit[1]?.value || ""}
          />
          <Form.Dropdown id="phone2Type" title="Type" defaultValue={phonesToEdit[1]?.type || "home"}>
            <Form.Dropdown.Item value="mobile" title="Mobile" icon={Icon.Mobile} />
            <Form.Dropdown.Item value="home" title="Home" icon={Icon.House} />
            <Form.Dropdown.Item value="work" title="Work" icon={Icon.Desktop} />
            <Form.Dropdown.Item value="main" title="Main" icon={Icon.Phone} />
            <Form.Dropdown.Item value="other" title="Other" icon={Icon.Phone} />
          </Form.Dropdown>

          {phonesToEdit.length > 2 && (
            <>
              <Form.TextField
                id="phone3"
                title="Additional Phone"
                placeholder="Additional Phone Number"
                defaultValue={phonesToEdit[2]?.value || ""}
              />
              <Form.Dropdown id="phone3Type" title="Type" defaultValue={phonesToEdit[2]?.type || "work"}>
                <Form.Dropdown.Item value="mobile" title="Mobile" icon={Icon.Mobile} />
                <Form.Dropdown.Item value="home" title="Home" icon={Icon.House} />
                <Form.Dropdown.Item value="work" title="Work" icon={Icon.Desktop} />
                <Form.Dropdown.Item value="main" title="Main" icon={Icon.Phone} />
                <Form.Dropdown.Item value="other" title="Other" icon={Icon.Phone} />
              </Form.Dropdown>
            </>
          )}
        </>
      )}

      {/* Organization section */}
      <Form.Separator />
      <Form.Description title="Work & Organization" text="Contact's professional information" />
      <Form.TextField id="company" title="Company" placeholder="Company Name" defaultValue={orgToEdit?.name || ""} />
      <Form.TextField id="jobTitle" title="Job Title" placeholder="Job Title" defaultValue={orgToEdit?.title || ""} />

      {/* Additional org details if they exist */}
      {showOrganizationDetails && (
        <>
          <Form.TextField
            id="department"
            title="Department"
            placeholder="Department"
            defaultValue={orgToEdit?.department || ""}
          />
          <Form.TextField
            id="jobDescription"
            title="Job Description"
            placeholder="Job Description"
            defaultValue={orgToEdit?.jobDescription || ""}
          />
        </>
      )}

      {/* Address section if it exists */}
      {showAddressFields && (
        <>
          <Form.Separator />
          <Form.Description title="Address" text="Contact's address information" />
          <Form.TextField
            id="addressStreet"
            title="Street"
            placeholder="Street Address"
            defaultValue={addressToEdit?.streetAddress || ""}
          />
          <Form.TextField
            id="addressExtended"
            title="Extended Address"
            placeholder="Apt, Suite, Building, etc."
            defaultValue={addressToEdit?.extendedAddress || ""}
          />
          <Form.TextField id="addressCity" title="City" placeholder="City" defaultValue={addressToEdit?.city || ""} />
          <Form.TextField
            id="addressRegion"
            title="State/Region"
            placeholder="State/Region"
            defaultValue={addressToEdit?.region || ""}
          />
          <Form.TextField
            id="addressPostal"
            title="Postal Code"
            placeholder="ZIP/Postal Code"
            defaultValue={addressToEdit?.postalCode || ""}
          />
          <Form.TextField
            id="addressCountry"
            title="Country"
            placeholder="Country"
            defaultValue={addressToEdit?.country || ""}
          />
          <Form.Dropdown id="addressType" title="Address Type" defaultValue={addressToEdit?.type || "home"}>
            <Form.Dropdown.Item value="home" title="Home" icon={Icon.House} />
            <Form.Dropdown.Item value="work" title="Work" icon={Icon.Desktop} />
            <Form.Dropdown.Item value="other" title="Other" icon={Icon.Envelope} />
          </Form.Dropdown>
        </>
      )}

      {/* Birthday section */}
      <Form.Separator />
      <Form.Description title="Birthday" text="Contact's birthday information" />
      <Form.TextField id="birthdayMonth" title="Month" placeholder="Month (1-12)" defaultValue={birthdayMonth} />
      <Form.TextField id="birthdayDay" title="Day" placeholder="Day (1-31)" defaultValue={birthdayDay} />
      <Form.TextField id="birthdayYear" title="Year" placeholder="Year (Optional)" defaultValue={birthdayYear} />

      {/* Website section */}
      <Form.Separator />
      <Form.Description title="Website" text="Contact's website information" />
      <Form.TextField
        id="website"
        title="Website"
        placeholder="https://example.com"
        defaultValue={websiteToEdit?.value || ""}
      />
      <Form.Dropdown id="websiteType" title="Website Type" defaultValue={websiteToEdit?.type || "home"}>
        <Form.Dropdown.Item value="home" title="Personal" icon={Icon.Person} />
        <Form.Dropdown.Item value="work" title="Work" icon={Icon.Desktop} />
        <Form.Dropdown.Item value="blog" title="Blog" icon={Icon.Pencil} />
        <Form.Dropdown.Item value="profile" title="Profile" icon={Icon.Link} />
        <Form.Dropdown.Item value="other" title="Other" icon={Icon.Link} />
      </Form.Dropdown>

      {/* Custom fields if they exist */}
      {showCustomFields && (
        <>
          <Form.Separator />
          <Form.Description title="Custom Fields" text="Custom information" />
          <Form.TextField
            id="customLabel1"
            title="Custom Field 1 Label"
            placeholder="Field Label"
            defaultValue={customFieldsToEdit[0]?.key || ""}
          />
          <Form.TextField
            id="customValue1"
            title="Custom Field 1 Value"
            placeholder="Field Value"
            defaultValue={customFieldsToEdit[0]?.value || ""}
          />

          {customFieldsToEdit.length > 1 && (
            <>
              <Form.TextField
                id="customLabel2"
                title="Custom Field 2 Label"
                placeholder="Field Label"
                defaultValue={customFieldsToEdit[1]?.key || ""}
              />
              <Form.TextField
                id="customValue2"
                title="Custom Field 2 Value"
                placeholder="Field Value"
                defaultValue={customFieldsToEdit[1]?.value || ""}
              />
            </>
          )}
        </>
      )}

      {/* Notes section */}
      <Form.Separator />
      <Form.Description title="Notes" text="Additional information about the contact" />
      <Form.TextArea
        id="notes"
        title="Notes"
        placeholder="Notes about this contact"
        defaultValue={bioToEdit?.value || ""}
      />
    </Form>
  );
}
