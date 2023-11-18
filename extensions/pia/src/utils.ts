import {closeMainWindow, getApplications, showHUD} from "@raycast/api";
import {exec} from 'child_process';
import {runAppleScript} from "run-applescript";
import {openPiaScript, piaPath} from "./constants";

export async function runPrivateInternetAcessCmd(cmd: string, message: string): Promise<void> {
    const apps = await getApplications();
    const app = apps.find((app) => app.name === "Private Internet Access");
    if (!app) {
        await showHUD("Private Internet Access app not found");
        return;
    }

    await closeMainWindow();
    await runAppleScript(openPiaScript)
    await exec(`${piaPath} ${cmd}`);

    await showHUD(message);
}