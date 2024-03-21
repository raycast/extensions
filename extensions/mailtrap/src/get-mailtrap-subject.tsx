import { getPreferenceValues } from "@raycast/api";
import { areGlobalPreferencesValid } from "./models/global-preferences";
import GuideView from "./views/guide";
import ListInboxsView from "./views/list-inboxs";

export interface SubjectCommandPreferences {
  subjectRegex?: string;
  clipboardRegex?: string;
  inboxId?: string;
  autoPaste?: boolean;
  onlyShowUnread?: boolean;
}

export default function GetMailtrapSubjectCommand() {
  if (!areGlobalPreferencesValid()) return <GuideView />;

  const preferences = getPreferenceValues<SubjectCommandPreferences>();

  return <ListInboxsView inboxId={preferences.inboxId ? parseInt(preferences.inboxId) : undefined} />;
}
