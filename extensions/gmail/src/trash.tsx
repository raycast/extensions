import View from "./components/view";
import { ListQueryCommand } from "./components/command";

export default function Command() {
  return (
    <View>
      <ListQueryCommand baseQuery={["in:trash"]} sectionTitle="Mails in Trash" emptyMessage="No Mails in the Trash" />
    </View>
  );
}
