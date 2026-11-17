import { FormValidation, getAvatarIcon, useFetch, useForm } from "@raycast/utils";
import { API_HEADERS, API_URL, parseAtomResponse, showError } from "./atom";
import { AtomContact, AtomContactCreate } from "./types";
import { Action, ActionPanel, Form, Icon, List, popToRoot, showToast, Toast } from "@raycast/api";

export default function DomainContacts() {
  const { isLoading, data: contacts } = useFetch(`${API_URL}/contacts`, {
    headers: API_HEADERS,
    parseResponse: parseAtomResponse<AtomContact[]>,
    initialData: [],
  });

  return (
    <List isLoading={isLoading} isShowingDetail>
      {contacts.map((contact) => (
        <List.Item
          key={contact.handle}
          icon={getAvatarIcon(contact.name)}
          title={contact.name}
          detail={
            <List.Item.Detail
              markdown={`${contact.handle}

${contact.name}

${contact.email}

${contact.phone}

---

${contact.address.join("\n")}

${contact.city}, ${contact.state || ""} ${contact.zip}

${contact.country}`}
            />
          }
          actions={
            <ActionPanel>
              <Action.Push icon={Icon.PlusCircle} title="Add New Address" target={<AddNewAddress />} />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}

function AddNewAddress() {
  const { handleSubmit, itemProps } = useForm<AtomContactCreate>({
    async onSubmit(values) {
      const toast = await showToast(Toast.Style.Animated, "Creating");
      try {
        const response = await fetch(`${API_URL}/contacts`, {
          method: "POST",
          headers: API_HEADERS,
          body: JSON.stringify(values),
        });
        await parseAtomResponse(response);
        toast.style = Toast.Style.Success;
        toast.title = "Created";
        await popToRoot();
      } catch (error) {
        showError(error);
      }
    },
    validation: {
      label: FormValidation.Required,
      first_name: FormValidation.Required,
      last_name: FormValidation.Required,
      email: FormValidation.Required,
      phone: FormValidation.Required,
      address_1: FormValidation.Required,
      country: FormValidation.Required,
      city: FormValidation.Required,
      state: FormValidation.Required,
      zip: FormValidation.Required,
    },
  });
  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm icon={Icon.Check} title="Save Profile" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField
        title="Contact Label *"
        info="A unique name to identify this profile, labels are for your internal reference only and won't be visible to the contact."
        {...itemProps.label}
      />
      <Form.TextField title="First Name *" placeholder="e.g. John" {...itemProps.first_name} />
      <Form.TextField title="Last Name *" placeholder="e.g. Doe" {...itemProps.last_name} />
      <Form.TextField
        title="Organization (Legal Owner Organization Only)"
        placeholder="Company Name"
        info="For some ccTLDs (like .io), entering an organization name will automatically expose your contact info in the public WHOIS."
        {...itemProps.organization}
      />
      <Form.TextField title="Email Address *" placeholder="email@example.com" {...itemProps.email} />
      <Form.TextField title="Phone Number *" placeholder="Enter Phone Number" {...itemProps.phone} />
      <Form.TextField title="Street Address *" {...itemProps.address_1} />
      <Form.TextField title="Street Address 2" {...itemProps.address_2} />
      <Form.TextField title="Country *" {...itemProps.country} />
      <Form.TextField title="City *" {...itemProps.city} />
      <Form.TextField title="State / Province *" {...itemProps.state} />
      <Form.TextField title="Zip / Postal Code *" {...itemProps.zip} />
      <Form.Separator />
      <Form.TagPicker title="Public Visibility" placeholder="Fields to disclose" {...itemProps.disclosed_fields}>
        <Form.TagPicker.Item title="Name" value="name" />
        <Form.TagPicker.Item title="Organization" value="organization" />
        <Form.TagPicker.Item title="Email" value="email" />
        <Form.TagPicker.Item title="Phone" value="phone" />
        <Form.TagPicker.Item title="Address" value="address" />
        <Form.TagPicker.Item title="Country" value="country" />
        <Form.TagPicker.Item title="City" value="city" />
        <Form.TagPicker.Item title="State / Province" value="state" />
        <Form.TagPicker.Item title="Zip / Postal Code" value="zip" />
      </Form.TagPicker>
    </Form>
  );
}
