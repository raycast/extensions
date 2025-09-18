import React from "react";
import { Action, ActionPanel, Form, useNavigation, showToast, Toast, Icon } from "@raycast/api";
import { useState } from "react";
import { createContact } from "../api/endpoints";

// Types for our form values
interface FormValues {
  // Name fields
  givenName: string;
  familyName: string;
  middleName: string;
  prefix: string;
  suffix: string;

  // Primary email
  primaryEmail: string;
  primaryEmailType: string;

  // Additional emails (up to 3)
  email2: string;
  email2Type: string;
  email3: string;
  email3Type: string;

  // Primary phone
  primaryPhone: string;
  primaryPhoneType: string;

  // Additional phones (up to 3)
  phone2: string;
  phone2Type: string;
  phone3: string;
  phone3Type: string;

  // Organization fields
  company: string;
  jobTitle: string;
  department: string;
  jobDescription: string;

  // Address fields
  addressStreet: string;
  addressExtended: string;
  addressCity: string;
  addressRegion: string;
  addressPostal: string;
  addressCountry: string;
  addressType: string;

  // Birthday
  birthdayYear: string;
  birthdayMonth: string;
  birthdayDay: string;

  // Website
  website: string;
  websiteType: string;

  // Custom fields
  customLabel1: string;
  customValue1: string;
  customLabel2: string;
  customValue2: string;

  // Notes
  notes: string;
}

export default function CreateContactForm() {
  const { pop } = useNavigation();
  const [isLoading, setIsLoading] = useState(false);
  const [showAdditionalEmails, setShowAdditionalEmails] = useState(false);
  const [showAdditionalPhones, setShowAdditionalPhones] = useState(false);
  const [showOrganizationDetails, setShowOrganizationDetails] = useState(false);
  const [showAddressFields, setShowAddressFields] = useState(false);
  const [showCustomFields, setShowCustomFields] = useState(false);

  async function handleSubmit(values: FormValues) {
    // Validate that at least some key information is provided
    if (!values.givenName && !values.familyName && !values.primaryEmail && !values.primaryPhone) {
      showToast({
        style: Toast.Style.Failure,
        title: "Please fill in at least one field",
        message: "Name, email, or phone number is required",
      });
      return;
    }

    setIsLoading(true);

    try {
      // Prepare data for contact creation
      const contactData: Record<string, unknown> = {};

      // Add name if provided
      if (values.givenName || values.familyName || values.middleName || values.prefix || values.suffix) {
        contactData.names = [
          {
            givenName: values.givenName,
            familyName: values.familyName,
            middleName: values.middleName,
            honorificPrefix: values.prefix,
            honorificSuffix: values.suffix,
          },
        ];
      }

      // Add emails if provided
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
        contactData.emailAddresses = emails;
      }

      // Add phones if provided
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
        contactData.phoneNumbers = phones;
      }

      // Add organization if provided
      if (values.company || values.jobTitle || values.department || values.jobDescription) {
        contactData.organizations = [
          {
            name: values.company,
            title: values.jobTitle,
            department: values.department,
            jobDescription: values.jobDescription,
          },
        ];
      }

      // Add address if provided
      if (
        values.addressStreet ||
        values.addressCity ||
        values.addressRegion ||
        values.addressPostal ||
        values.addressCountry
      ) {
        contactData.addresses = [
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
      }

      // Add birthday if provided
      if (values.birthdayDay || values.birthdayMonth) {
        const birthdayData: { date: Record<string, number> } = {
          date: {},
        };

        if (values.birthdayDay) {
          birthdayData.date.day = parseInt(values.birthdayDay);
        }
        if (values.birthdayMonth) {
          birthdayData.date.month = parseInt(values.birthdayMonth);
        }
        if (values.birthdayYear) {
          birthdayData.date.year = parseInt(values.birthdayYear);
        }

        contactData.birthdays = [birthdayData];
      }

      // Add website if provided
      if (values.website) {
        contactData.urls = [
          {
            value: values.website,
            type: values.websiteType || "home",
          },
        ];
      }

      // Add custom fields if provided
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
        contactData.userDefined = userDefined;
      }

      // Add notes if provided
      if (values.notes) {
        contactData.biographies = [
          {
            value: values.notes,
            contentType: "TEXT_PLAIN",
          },
        ];
      }

      await createContact(contactData);

      showToast({
        style: Toast.Style.Success,
        title: "Contact created",
      });

      pop();
    } catch (error) {
      console.error("Error creating contact:", error);

      // Provide a more user-friendly error message
      let errorMessage = "An unknown error occurred";
      if (error instanceof Error) {
        errorMessage = error.message;
      }

      showToast({
        style: Toast.Style.Failure,
        title: "Failed to create contact",
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
          <Action.SubmitForm onSubmit={handleSubmit} title="Create Contact" />
        </ActionPanel>
      }
    >
      {/* Name section */}
      <Form.Description title="Name" text="Contact's name information" />
      <Form.TextField id="givenName" title="First Name" placeholder="First Name" />
      <Form.TextField id="middleName" title="Middle Name" placeholder="Middle Name" />
      <Form.TextField id="familyName" title="Last Name" placeholder="Last Name" />
      <Form.TextField id="prefix" title="Prefix" placeholder="Mr., Mrs., Dr., etc." />
      <Form.TextField id="suffix" title="Suffix" placeholder="Jr., Sr., M.D., etc." />

      {/* Email section */}
      <Form.Separator />
      <Form.Description title="Email Addresses" text="Contact's email information" />
      <Form.TextField id="primaryEmail" title="Primary Email" placeholder="Primary Email Address" />
      <Form.Dropdown id="primaryEmailType" title="Type" defaultValue="home">
        <Form.Dropdown.Item value="home" title="Home" icon={Icon.House} />
        <Form.Dropdown.Item value="work" title="Work" icon={Icon.Desktop} />
        <Form.Dropdown.Item value="other" title="Other" icon={Icon.Envelope} />
      </Form.Dropdown>

      <Form.Checkbox id="showMoreEmails" label="Add more email addresses" onChange={setShowAdditionalEmails} />

      {showAdditionalEmails && (
        <>
          <Form.TextField id="email2" title="Secondary Email" placeholder="Secondary Email Address" />
          <Form.Dropdown id="email2Type" title="Type" defaultValue="work">
            <Form.Dropdown.Item value="home" title="Home" icon={Icon.House} />
            <Form.Dropdown.Item value="work" title="Work" icon={Icon.Desktop} />
            <Form.Dropdown.Item value="other" title="Other" icon={Icon.Envelope} />
          </Form.Dropdown>

          <Form.TextField id="email3" title="Additional Email" placeholder="Additional Email Address" />
          <Form.Dropdown id="email3Type" title="Type" defaultValue="other">
            <Form.Dropdown.Item value="home" title="Home" icon={Icon.House} />
            <Form.Dropdown.Item value="work" title="Work" icon={Icon.Desktop} />
            <Form.Dropdown.Item value="other" title="Other" icon={Icon.Envelope} />
          </Form.Dropdown>
        </>
      )}

      {/* Phone section */}
      <Form.Separator />
      <Form.Description title="Phone Numbers" text="Contact's phone information" />
      <Form.TextField id="primaryPhone" title="Primary Phone" placeholder="Primary Phone Number" />
      <Form.Dropdown id="primaryPhoneType" title="Type" defaultValue="mobile">
        <Form.Dropdown.Item value="mobile" title="Mobile" icon={Icon.Mobile} />
        <Form.Dropdown.Item value="home" title="Home" icon={Icon.House} />
        <Form.Dropdown.Item value="work" title="Work" icon={Icon.Desktop} />
        <Form.Dropdown.Item value="main" title="Main" icon={Icon.Phone} />
        <Form.Dropdown.Item value="other" title="Other" icon={Icon.Phone} />
      </Form.Dropdown>

      <Form.Checkbox id="showMorePhones" label="Add more phone numbers" onChange={setShowAdditionalPhones} />

      {showAdditionalPhones && (
        <>
          <Form.TextField id="phone2" title="Secondary Phone" placeholder="Secondary Phone Number" />
          <Form.Dropdown id="phone2Type" title="Type" defaultValue="home">
            <Form.Dropdown.Item value="mobile" title="Mobile" icon={Icon.Mobile} />
            <Form.Dropdown.Item value="home" title="Home" icon={Icon.House} />
            <Form.Dropdown.Item value="work" title="Work" icon={Icon.Desktop} />
            <Form.Dropdown.Item value="main" title="Main" icon={Icon.Phone} />
            <Form.Dropdown.Item value="other" title="Other" icon={Icon.Phone} />
          </Form.Dropdown>

          <Form.TextField id="phone3" title="Additional Phone" placeholder="Additional Phone Number" />
          <Form.Dropdown id="phone3Type" title="Type" defaultValue="work">
            <Form.Dropdown.Item value="mobile" title="Mobile" icon={Icon.Mobile} />
            <Form.Dropdown.Item value="home" title="Home" icon={Icon.House} />
            <Form.Dropdown.Item value="work" title="Work" icon={Icon.Desktop} />
            <Form.Dropdown.Item value="main" title="Main" icon={Icon.Phone} />
            <Form.Dropdown.Item value="other" title="Other" icon={Icon.Phone} />
          </Form.Dropdown>
        </>
      )}

      {/* Organization section */}
      <Form.Separator />
      <Form.Description title="Work & Organization" text="Contact's professional information" />
      <Form.TextField id="company" title="Company" placeholder="Company Name" />
      <Form.TextField id="jobTitle" title="Job Title" placeholder="Job Title" />

      <Form.Checkbox
        id="showMoreOrgDetails"
        label="Add more organization details"
        onChange={setShowOrganizationDetails}
      />

      {showOrganizationDetails && (
        <>
          <Form.TextField id="department" title="Department" placeholder="Department" />
          <Form.TextField id="jobDescription" title="Job Description" placeholder="Job Description" />
        </>
      )}

      {/* Address section */}
      <Form.Separator />
      <Form.Description title="Address" text="Contact's address information" />

      <Form.Checkbox id="showAddressFields" label="Add address information" onChange={setShowAddressFields} />

      {showAddressFields && (
        <>
          <Form.TextField id="addressStreet" title="Street" placeholder="Street Address" />
          <Form.TextField id="addressExtended" title="Extended Address" placeholder="Apt, Suite, Building, etc." />
          <Form.TextField id="addressCity" title="City" placeholder="City" />
          <Form.TextField id="addressRegion" title="State/Region" placeholder="State/Region" />
          <Form.TextField id="addressPostal" title="Postal Code" placeholder="ZIP/Postal Code" />
          <Form.TextField id="addressCountry" title="Country" placeholder="Country" />
          <Form.Dropdown id="addressType" title="Address Type" defaultValue="home">
            <Form.Dropdown.Item value="home" title="Home" icon={Icon.House} />
            <Form.Dropdown.Item value="work" title="Work" icon={Icon.Desktop} />
            <Form.Dropdown.Item value="other" title="Other" icon={Icon.Envelope} />
          </Form.Dropdown>
        </>
      )}

      {/* Birthday section */}
      <Form.Separator />
      <Form.Description title="Birthday" text="Contact's birthday information" />
      <Form.TextField id="birthdayMonth" title="Month" placeholder="Month (1-12)" />
      <Form.TextField id="birthdayDay" title="Day" placeholder="Day (1-31)" />
      <Form.TextField id="birthdayYear" title="Year" placeholder="Year (Optional)" />

      {/* Website section */}
      <Form.Separator />
      <Form.Description title="Website" text="Contact's website information" />
      <Form.TextField id="website" title="Website" placeholder="https://example.com" />
      <Form.Dropdown id="websiteType" title="Website Type" defaultValue="home">
        <Form.Dropdown.Item value="home" title="Personal" icon={Icon.Person} />
        <Form.Dropdown.Item value="work" title="Work" icon={Icon.Desktop} />
        <Form.Dropdown.Item value="blog" title="Blog" icon={Icon.Pencil} />
        <Form.Dropdown.Item value="profile" title="Profile" icon={Icon.Link} />
        <Form.Dropdown.Item value="other" title="Other" icon={Icon.Link} />
      </Form.Dropdown>

      {/* Custom fields */}
      <Form.Separator />
      <Form.Description title="Custom Fields" text="Add custom information" />

      <Form.Checkbox id="showCustomFields" label="Add custom fields" onChange={setShowCustomFields} />

      {showCustomFields && (
        <>
          <Form.TextField id="customLabel1" title="Custom Field 1 Label" placeholder="Field Label" />
          <Form.TextField id="customValue1" title="Custom Field 1 Value" placeholder="Field Value" />
          <Form.TextField id="customLabel2" title="Custom Field 2 Label" placeholder="Field Label" />
          <Form.TextField id="customValue2" title="Custom Field 2 Value" placeholder="Field Value" />
        </>
      )}

      {/* Notes section */}
      <Form.Separator />
      <Form.Description title="Notes" text="Additional information about the contact" />
      <Form.TextArea id="notes" title="Notes" placeholder="Notes about this contact" />
    </Form>
  );
}
