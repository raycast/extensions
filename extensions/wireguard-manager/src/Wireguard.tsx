import { LocalStorage, showToast, Toast } from "@raycast/api"
import { exec as execCallback } from "child_process"

export interface Connection {
    name: string
    status: string
    flag?: string
}

async function exec(command: string): Promise<string> {
    return new Promise((resolve, reject) => {
        execCallback(command, (err, stdout) => {
            if (err) {
                reject(err)
                return
            }
            resolve(stdout)
        })
    })
}

export interface Connections {
    connected?: Connection
    available: Connection[]
}

export async function getWireguardConnections(): Promise<Connections> {
    const output = await exec("/usr/sbin/scutil --nc list | grep 'com.wireguard.macos'")
    const lines = output.split("\n").filter((line) => line.includes("onnected"))
    const available = lines.map((line) => {
        const match = line.match(/"(.+)"\s*(\(.+\))?/)
        const name = match ? match[1] : ""
        if (!name) console.log({ line })
        const status = line.includes("(Connected)") ? "Connected" : "Disconnected"
        return { name, status, flag: getFlagFromName(name) }
    })
    const connectedItemIndex = available.findIndex((connection) => connection.status === "Connected")
    const connected = available[connectedItemIndex]
    available.splice(connectedItemIndex, 1)
    return { connected, available }
}

export async function toggleConnection(c: Connection) {
    /* Save to recents before toggle */
    await UpdateRecents(c)
    const command = c.status === "Connected" ? "stop" : "start"
    await exec(`/usr/sbin/scutil --nc ${command} ${c.name}`)
    showToast(Toast.Style.Success, `${c.name} ${command}ed`)
}

async function UpdateRecents(c: Connection) {
    const _recents = (await LocalStorage.getItem<string>("recents")) || ""
    const recents = _recents.split(",").filter((r) => r !== c.name)
    recents.unshift(c.name)
    await LocalStorage.setItem("recents", recents.join(","))
}

function getFlagFromName(name: string) {
    const countryCode = name.split("-")[0].replace(/[0-9]/g, "")
    const flag = getFlagEmoji(countryCode)
    return flag || "🌐"
}

function getFlagEmoji(countryCode: string): string | undefined {
    const codePoints = countryCode
        .toUpperCase()
        .split("")
        .map((char) => char.charCodeAt(0) + 127397)

    if (codePoints.length !== 2) {
        return undefined
    }

    return String.fromCodePoint(...codePoints)
}
