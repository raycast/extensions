import { showToast, Toast } from "@raycast/api";
import { EXPORT_FILE_PATH } from "./constants/ente";
import { getSecrets, parseSecrets, storeSecrets } from "./helpers/secrets";

export default async function Command() {
  const toast = await showToast({
    style: Toast.Style.Animated,
    title: "Importing secrets",
  });

  try {
    const secrets = parseSecrets(getSecrets(EXPORT_FILE_PATH));
    await storeSecrets(secrets);

    if (secrets.length > 0) {
      toast.style = Toast.Style.Success;
      toast.title = " ";
      toast.message = `${secrets.length} secrets imported!`;
    } else {
      toast.style = Toast.Style.Failure;
      toast.title = "No secrets found";
      toast.message = "Please check your export path";
    }
  } catch (error) {
    toast.style = Toast.Style.Failure;
    toast.title = "Error importing secrets";
    if (error instanceof Error) {
      toast.message = error.message;
    }
  }
}
