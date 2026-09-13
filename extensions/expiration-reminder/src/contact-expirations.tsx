import { ContactSearchList } from "./components/ContactSearchList";

// Standalone entry point: pick a contact via search, then drill into their
// expirations (the primary action pushes the contact's expiration list).
export default function ContactExpirationsCommand() {
  return <ContactSearchList commandName="contact-expirations" />;
}
