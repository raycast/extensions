import { open } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { SETUP_URL } from "./components/Setup";

export default async function Command() {
  try {
    await open(SETUP_URL);
  } catch (error) {
    await showFailureToast(error, {
      title: "Could Not Open Setup Instructions",
      message: "Open ghosthand.dev in your browser and follow the iPhone setup instructions.",
    });
  }
}
