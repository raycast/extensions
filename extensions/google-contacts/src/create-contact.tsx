import { withAccessToken } from "@raycast/utils";
import { google } from "./oauth";
import ContactForm from "./components/ContactForm";

function CreateContact() {
  return <ContactForm />;
}

export default withAccessToken(google())(CreateContact);
