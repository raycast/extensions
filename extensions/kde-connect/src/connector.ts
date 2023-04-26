import { readFileSync } from "fs";
import { execSync } from "child_process";

const appPath = "/Applications/kdeconnect-indicator.app/Contents/MacOS/kdeconnect-cli"

export function appExists() {
    try {
        readFileSync(appPath)
        return true
    } catch (e) {
        console.log(e)
        return false
    }
}

export enum KDECOptions {
    listDevice = "-l",
}

export class KDEConnectDevice {
    deviceID: string

    constructor(deviceID: string) {
        this.deviceID = deviceID
    }

    private executeCommand(option: KDECOptions, args: string[] = []) {
        const result = execSync(`${appPath} ${option} ${this.deviceID} ${args.join(" ")}`)
        return result.toString()
    }
}
