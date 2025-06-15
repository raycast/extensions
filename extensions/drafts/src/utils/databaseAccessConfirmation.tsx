import { Alert, confirmAlert, Icon, LocalStorage, popToRoot, showToast, Toast } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";

const draftsDatabaseAccessConsentKey = "draftsDatabaseAccessConsent";

export async function showConsentAlert() {
  try {
    const consent = await LocalStorage.getItem<boolean>(draftsDatabaseAccessConsentKey);
    if (consent) {
      return true;
    }

    const options: Alert.Options = {
      title: "Drafts Database Access",
      message: `The commands will access Drafts' internal database with read-only access. This is harmless, but if Drafts is updated and the database changes, it might cause issues in the extension.`,
      primaryAction: {
        title: "Accept",
        onAction: async () => {
          await LocalStorage.setItem(draftsDatabaseAccessConsentKey, true);
        },
      },
      icon: Icon.Warning,
    };

    return await confirmAlert(options);
  } catch (error) {
    showFailureToast("Failed to load database access consent");
    return false;
  }
}

export function returnToRootWithMissingContent() {
  showToast({ title: "Database access not given", style: Toast.Style.Failure });
  setTimeout(() => {
    popToRoot({ clearSearchBar: true });
  }, 1000);
}
