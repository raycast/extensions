import View from "./components/view";
import { ListQueryCommand } from "./components/command";

// NOTE: in:archive is not available via the query. We need to replace it with "-in:inbox -is:draft" to achieve the same

export default function Command() {
  return (
    <View>
      <ListQueryCommand
        baseQuery={["-in:inbox", "-is:draft"]}
        sectionTitle="Archived Mails"
        emptyMessage="No Mails in the Archive"
      />
    </View>
  );
}
