import { getPreferenceValues, Icon, List } from "@raycast/api";
import { useFetch } from "@raycast/utils";
import { Contact } from "./types";

const { api_key } = getPreferenceValues<ExtensionPreferences>();
const API_URL = "https://api.nicnames.com/2/";
const API_HEADERS = {
  Accept: "application/json",
  "Content-Type": "application/json",
  "x-api-key": api_key
};

export default function Contacts() {
  const {isLoading, data: contacts} = useFetch(API_URL + "contact", {
    headers: API_HEADERS,
    mapResult(result: {list: Contact[]}) {
      return {
        data: result.list
      }
    },
    initialData: []
  });

  return <List isLoading={isLoading}>
    {contacts.map(contact => <List.Item key={contact.contactId} icon={Icon.Person} title={[contact.firstName, contact.middleName, contact.lastName].join(" ")} subtitle={contact.email} />)}
  </List>
}
