import { Detail, ActionPanel, Action, Toast, openExtensionPreferences, showToast } from "@raycast/api";

export function ValidatePreferences(preferences: Preferences) {
  if (!preferences.path) {
    showToast({ style: Toast.Style.Failure, title: "Path to bibliography missing" });
    return {
      status: false,
      component: (
        <Detail
          markdown={"Please set the **path** to your bibliography in the extension settings."}
          actions={
            <ActionPanel>
              <Action title="Settings" onAction={openExtensionPreferences} />
            </ActionPanel>
          }
        />
      ),
      path: "",
      bibfile: "",
    };
  } else if (!preferences.bibfile) {
    showToast({ style: Toast.Style.Failure, title: "Path to .bib file missing" });
    return {
      status: false,
      component: (
        <Detail
          markdown={"Please select the **.bibfile** in the extension settings."}
          actions={
            <ActionPanel>
              <Action title="Settings" onAction={openExtensionPreferences} />
            </ActionPanel>
          }
        />
      ),
      path: "",
      bibfile: "",
    };
  } else if (preferences.bibfile.slice(-4) !== ".bib") {
    showToast({ style: Toast.Style.Failure, title: "Invalid .bib file selected" });
    return {
      status: false,
      component: (
        <Detail
          markdown={"Please select a **.bib** file in the extension settings."}
          metadata={
            <Detail.Metadata>
              {" "}
              <Detail.Metadata.Label title="Currently selected" text={preferences.bibfile} />{" "}
            </Detail.Metadata>
          }
          actions={
            <ActionPanel>
              <Action title="Settings" onAction={openExtensionPreferences} />
            </ActionPanel>
          }
        />
      ),
      path: "",
      bibfile: "",
    };
  }
  return { status: true, component: null, path: preferences.path, bibfile: preferences.bibfile };
}
