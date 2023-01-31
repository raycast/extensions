import { Alert, confirmAlert, popToRoot, showHUD, showToast, Toast } from "@raycast/api";
import { eraseDeletedItems, getAccountNames } from "./utils";

interface Arguments {
  accountName: string;
}

export default async function Command(props: { arguments: Arguments }) {
  const { accountName } = props.arguments;
  const accountNameTrimmed = accountName.trim();

  const options: Alert.Options = {
    title: "Permanently Erase Deleted Items",
    message: "Are you sure?",
    primaryAction: {
      title: "Erase",
      style: Alert.ActionStyle.Destructive,
    },
  };

  if (!(await confirmAlert(options))) {
    return;
  }

  if (accountNameTrimmed == "") {
    try {
      await eraseDeletedItems();
      await showHUD("Cleared deleted messages in all accounts");
      return;
    } catch (error) {
      console.log("E-D-1", error);
      await popToRoot();
      await showToast({ title: "Failed to clear deleted messages", style: Toast.Style.Failure });
    }
  }

  const accounts = await (await getAccountNames()).split(", ");
  if (accounts.includes(accountNameTrimmed)) {
    try {
      await eraseDeletedItems(accountNameTrimmed);
      await showHUD(`Cleared deleted messages in ${accountNameTrimmed} account`);
    } catch (error) {
      console.log("E-D-2", error);
      await popToRoot();
      await showToast({ title: "Failed to clear deleted messages", style: Toast.Style.Failure });
    }
  } else {
    try {
      await popToRoot();
      await showToast({
        title: "Cannot Clear Deleted Messages",
        message: `No account named "${accountNameTrimmed}"`,
        style: Toast.Style.Failure,
      });
    } catch (error) {
      console.log("E-D-3", error);
      await popToRoot();
      await showToast({ title: "Failed to clear deleted messages", style: Toast.Style.Failure });
    }
  }
}
