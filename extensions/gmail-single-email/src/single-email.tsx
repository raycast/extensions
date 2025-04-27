import View from "./components/view";
import { SingleEmailDetailView } from "./components/singlemail";

export default function Command() {
  return (
    <View>
      <SingleEmailDetailView baseQuery={["label=INBOX"]} emptyMessage="No emails in inbox 📬" maxResults={1} />
    </View>
  );
}
