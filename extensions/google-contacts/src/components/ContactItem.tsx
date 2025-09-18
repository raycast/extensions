import React from "react";
import { Action, ActionPanel, Icon, List, Color } from "@raycast/api";
import { Contact, LocalFavorites } from "../types";
import { getPrimaryName, isFavorite, getIcon, getFirstLastName, getResourceId, getBirthdayInfo } from "../utils";
import EditContactForm from "./EditContactForm";

export default function ContactItem(props: {
  contact: Contact;
  onToggleFavorite: () => void;
  onDelete: () => void;
  localFavorites: LocalFavorites;
}) {
  const { contact, localFavorites } = props;
  const name = getPrimaryName(contact);
  const simpleName = getFirstLastName(contact);

  return (
    <List.Item
      key={contact.resourceName}
      icon={getIcon(contact, localFavorites)}
      id={contact.resourceName}
      title={simpleName}
      detail={
        <List.Item.Detail
          metadata={
            <List.Item.Detail.Metadata>
              {/* 1. Name (First + Last) */}
              <List.Item.Detail.Metadata.Label title="Name" text={name} />

              {/* 2. Position (Job Title) */}
              {contact.organizations && contact.organizations.length > 0 && contact.organizations[0].title && (
                <List.Item.Detail.Metadata.Label title="Position" text={contact.organizations[0].title} />
              )}

              {/* 3. Company (Organization) */}
              {contact.organizations && contact.organizations.length > 0 && (
                <List.Item.Detail.Metadata.Label title="Company" text={contact.organizations[0].name || ""} />
              )}

              {/* 4. Birthday - show right after company */}
              {contact.birthdays && contact.birthdays.length > 0 && (
                <List.Item.Detail.Metadata.Label title="Birthday" text={getBirthdayInfo(contact) || ""} />
              )}

              {/* 5. Emails - show as heading without icon */}
              {contact.emailAddresses && contact.emailAddresses.length > 0 && (
                <>
                  <List.Item.Detail.Metadata.Separator />
                  <List.Item.Detail.Metadata.Label title="E-Mail Addresses" text="" />
                  {contact.emailAddresses.map((emailObj, index) => (
                    <List.Item.Detail.Metadata.Label
                      key={`email-${index}`}
                      title={emailObj.type ? emailObj.type.charAt(0).toUpperCase() + emailObj.type.slice(1) : "Email"}
                      text={emailObj.value || ""}
                    />
                  ))}
                </>
              )}

              {/* 6. Phone Numbers - show as heading without icon */}
              {contact.phoneNumbers && contact.phoneNumbers.length > 0 && (
                <>
                  <List.Item.Detail.Metadata.Separator />
                  <List.Item.Detail.Metadata.Label title="Numbers" text="" />
                  {contact.phoneNumbers.map((phoneObj, index) => (
                    <List.Item.Detail.Metadata.Label
                      key={`phone-${index}`}
                      title={phoneObj.type ? phoneObj.type.charAt(0).toUpperCase() + phoneObj.type.slice(1) : "Phone"}
                      text={phoneObj.value || ""}
                    />
                  ))}
                </>
              )}

              {/* 7. Websites - show all if available */}
              {contact.urls && contact.urls.length > 0 && (
                <>
                  <List.Item.Detail.Metadata.Separator />
                  <List.Item.Detail.Metadata.Label title="WEBSITES" text="" />
                  {contact.urls.map((url, index) => (
                    <List.Item.Detail.Metadata.Label
                      key={`url-${index}`}
                      title={url.type ? url.type.charAt(0).toUpperCase() + url.type.slice(1) : `Website ${index + 1}`}
                      text={url.value || ""}
                    />
                  ))}
                </>
              )}

              {/* 8. Custom Fields - show all if available */}
              {contact.userDefined && contact.userDefined.length > 0 && (
                <>
                  <List.Item.Detail.Metadata.Separator />
                  <List.Item.Detail.Metadata.Label title="CUSTOM FIELDS" text="" />
                  {contact.userDefined.map((field, index) => (
                    <List.Item.Detail.Metadata.Label
                      key={`custom-${index}`}
                      title={field.key ? field.key.charAt(0).toUpperCase() + field.key.slice(1) : `Field ${index + 1}`}
                      text={field.value || ""}
                    />
                  ))}
                </>
              )}

              {/* 9. Notes */}
              {contact.biographies && contact.biographies.length > 0 && contact.biographies[0].value && (
                <>
                  <List.Item.Detail.Metadata.Separator />
                  <List.Item.Detail.Metadata.Label title="NOTES" text={contact.biographies[0].value} />
                </>
              )}

              {/* 10. Addresses - show all addresses */}
              {contact.addresses && contact.addresses.length > 0 && (
                <>
                  <List.Item.Detail.Metadata.Separator />
                  <List.Item.Detail.Metadata.Label title="ADDRESSES" text="" />
                  {contact.addresses.map((address, index) => (
                    <List.Item.Detail.Metadata.Label
                      key={`address-${index}`}
                      title={
                        address.type
                          ? address.type.charAt(0).toUpperCase() + address.type.slice(1)
                          : `Address ${index + 1}`
                      }
                      text={address.formattedValue || ""}
                    />
                  ))}
                </>
              )}
            </List.Item.Detail.Metadata>
          }
        />
      }
      actions={
        <ActionPanel>
          {/* Edit Contact Action */}
          <Action.Push
            title="Edit Contact"
            icon={Icon.Pencil}
            shortcut={{ modifiers: ["cmd"], key: "e" }}
            target={<EditContactForm contact={contact} />}
          />

          {/* Toggle Favorite Action */}
          <Action
            title={isFavorite(contact, localFavorites) ? "Remove from Favorites" : "Add to Favorites"}
            icon={{
              source: Icon.Star,
              tintColor: isFavorite(contact, localFavorites) ? Color.PrimaryText : Color.Yellow,
            }}
            shortcut={{ modifiers: ["cmd"], key: "f" }}
            onAction={props.onToggleFavorite}
          />

          {/* Delete Contact Action */}
          <Action
            title="Delete Contact"
            icon={Icon.Trash}
            style={Action.Style.Destructive}
            shortcut={{ modifiers: ["cmd"], key: "backspace" }}
            onAction={props.onDelete}
          />

          {/* Open in Google Contacts */}
          <Action.OpenInBrowser
            title="Open in Google Contacts"
            url={`https://contacts.google.com/person/${getResourceId(contact.resourceName)}`}
            shortcut={{ modifiers: ["cmd"], key: "c" }}
          />

          {/* Dynamic Copy Actions for All Emails */}
          {contact.emailAddresses && contact.emailAddresses.length > 0 && (
            <ActionPanel.Section title="Copy Email">
              {contact.emailAddresses.map((emailObj, index) => {
                const emailType = emailObj.type
                  ? emailObj.type.charAt(0).toUpperCase() + emailObj.type.slice(1)
                  : "Email";

                // Only set primary shortcut for first email
                const isPrimary =
                  emailObj.metadata?.primary ||
                  (index === 0 && !contact.emailAddresses?.find((e) => e.metadata?.primary));

                return (
                  <Action.CopyToClipboard
                    key={`copy-email-${index}`}
                    title={`Copy ${emailType} Email${isPrimary ? " (Primary)" : ""}`}
                    content={emailObj.value || ""}
                    {...(isPrimary ? { shortcut: { modifiers: ["cmd", "shift"], key: "e" } } : {})}
                  />
                );
              })}
            </ActionPanel.Section>
          )}

          {/* Dynamic Copy Actions for All Phone Numbers */}
          {contact.phoneNumbers && contact.phoneNumbers.length > 0 && (
            <ActionPanel.Section title="Copy Phone">
              {contact.phoneNumbers.map((phoneObj, index) => {
                const phoneType = phoneObj.type
                  ? phoneObj.type.charAt(0).toUpperCase() + phoneObj.type.slice(1)
                  : "Phone";

                // Only set primary shortcut for first phone
                const isPrimary =
                  phoneObj.metadata?.primary ||
                  (index === 0 && !contact.phoneNumbers?.find((p) => p.metadata?.primary));

                return (
                  <Action.CopyToClipboard
                    key={`copy-phone-${index}`}
                    title={`Copy ${phoneType} Number${isPrimary ? " (Primary)" : ""}`}
                    content={phoneObj.value || ""}
                    {...(isPrimary ? { shortcut: { modifiers: ["cmd", "shift"], key: "p" } } : {})}
                  />
                );
              })}
            </ActionPanel.Section>
          )}

          {/* Copy Address Action */}
          {contact.addresses && contact.addresses.length > 0 && (
            <ActionPanel.Section title="Copy Address">
              {contact.addresses.map((address, index) => {
                const addressType = address.type
                  ? address.type.charAt(0).toUpperCase() + address.type.slice(1)
                  : "Address";

                // Only set primary shortcut for first address
                const isPrimary =
                  address.metadata?.primary || (index === 0 && !contact.addresses?.find((a) => a.metadata?.primary));

                return (
                  <Action.CopyToClipboard
                    key={`copy-address-${index}`}
                    title={`Copy ${addressType} Address${isPrimary ? " (Primary)" : ""}`}
                    content={address.formattedValue || ""}
                    {...(isPrimary ? { shortcut: { modifiers: ["cmd", "shift"], key: "a" } } : {})}
                  />
                );
              })}
            </ActionPanel.Section>
          )}
        </ActionPanel>
      }
    />
  );
}
