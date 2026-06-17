import { List, Icon } from "@raycast/api";
import { getContacts } from "./utils/chatwork-api";
import { useCachedPromise, withAccessToken } from "@raycast/utils";
import { provider } from "./utils/oauth";

export default withAccessToken(provider)(CommandToSearchContacts);

function CommandToSearchContacts() {
  const { isLoading, data: contacts } = useCachedPromise(getContacts, [], {
    initialData: [],
    failureToastOptions: {
      title: "Contacts Error",
    },
  });

  return (
    <List isLoading={isLoading}>
      {!isLoading && !contacts.length ? (
        <List.EmptyView icon={Icon.TwoPeople} title="Currently there is no user that you can contact" />
      ) : (
        contacts.map((contact) => (
          <List.Item
            key={contact.account_id}
            icon={contact.avatar_image_url}
            title={contact.name}
            subtitle={contact.organization_name || contact.organization_id.toString()}
            accessories={[{ text: contact.department }]}
          />
        ))
      )}
    </List>
  );
}
