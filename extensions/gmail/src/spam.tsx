import View from "./components/view";
import { ListQueryCommand } from "./components/command";

export default function Command() {
  return (
    <View>
      <ListQueryCommand baseQuery={["in:spam"]} sectionTitle="Spam Mails" emptyMessage="No Spam Mails" />
    </View>
  );
}
