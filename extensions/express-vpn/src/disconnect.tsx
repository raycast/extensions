import { closeMainWindow, showToast, Toast } from "@raycast/api";
import { setTimeout } from 'timers/promises';
import { runExpressoDisconnect } from "./lib/expresso";
import { hasCLI, downloadCLI } from "./lib/cli";


export async function disconnectVPN() {
    console.log(`Disconnect requested`);

    const toast = await showToast({
        style: Toast.Style.Animated,
        title: `Disconnecting ExpressVPN...`,
    });

    try {
        await runExpressoDisconnect();

        // Executed if no errors
        console.log(`Disconnect succeeded`);

        toast.style = Toast.Style.Success;
        toast.title = "Disconnected!";

    } catch (error) {
        console.log(`Disconnect failed`);

        toast.style = Toast.Style.Failure;
        toast.title = "Failed to disconnect!";
    }

    // Sleep 3s to show the updated toast
    await setTimeout(2000);

    closeMainWindow();
}

export async function downloadCLIUI() {
    console.log(`Downloading CLI`);

    const toast = await showToast({
        style: Toast.Style.Animated,
        title: `Downloading ExpressVPN helper tool...`,
    });

    try {
        await downloadCLI();
      } catch (error: any) {
        console.log("Download failed: " + error);

        toast.style = Toast.Style.Failure;
        toast.title = "Failed to download helper tool!";
        await setTimeout(5000);
    }
}

export default async function main() {
    console.log("Disconnect command");

    if(hasCLI() === false) {
        console.log("Download CLI");
        await downloadCLIUI();
    }

    await disconnectVPN();
}
