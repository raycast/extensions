import View from "./components/view";
import { ListQueryCommand } from "./components/command";

export default function Command() {
  return (
    <View>
      <ListQueryCommand
        baseQuery={["is:unread", "label=INBOX"]}
        sectionTitle="Unread Mails"
        emptyMessage="No unread Mails 🤗"
      />
    </View>
  );
}
