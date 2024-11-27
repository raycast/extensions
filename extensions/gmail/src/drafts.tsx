import View from "./components/view";
import { ListQueryCommand } from "./components/command";

export default function Command() {
  return (
    <View>
      <ListQueryCommand baseQuery={["is:draft"]} sectionTitle="Draft Mails" emptyMessage="No Drafts" />
    </View>
  );
}
