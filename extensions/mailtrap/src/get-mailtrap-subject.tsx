import { getPreferenceValues } from "@raycast/api";
import ListInboxsView from "./views/list-inboxs";

export default function GetMailtrapSubjectCommand() {
  const { inboxId } = getPreferenceValues<Preferences.GetMailtrapSubject>();

  return <ListInboxsView inboxId={inboxId ? parseInt(inboxId) : undefined} />;
}
