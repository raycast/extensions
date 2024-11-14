import { showToast, Toast } from "@raycast/api";
import { moveWindowToSpace } from "swift:../swift";

export default async function main() {
  try {
    await moveWindowToSpace("prev");
  } catch (error) {
    const message = (error as Error).message;
    showToast({ title: "Could not move window", message: message, style: Toast.Style.Failure });
  }
}
