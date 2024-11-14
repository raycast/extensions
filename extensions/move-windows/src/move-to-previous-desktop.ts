import { showToast, Toast } from "@raycast/api";
import { moveWindowToSpace } from "swift:../swift";

export default async function main() {
    try {
        await moveWindowToSpace("prev");
    }
    catch (error) {
        showToast({ title: "Could not move window", message: error.message, style: Toast.Style.Failure });
    }
}
