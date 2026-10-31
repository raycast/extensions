import { showToast, Toast } from "@raycast/api";
import { callWireguide } from "./call";

async function run(command: "connect" | "disconnect", name: string, pending: string, done: string) {
    const toast = await showToast(Toast.Style.Animated, pending);
    try {
        await callWireguide(command, name);
    } catch (error) {
        toast.style = Toast.Style.Failure;
        toast.title = `Failed to ${command} ${name}`;
        toast.message = error instanceof Error ? error.message : String(error);
        throw error;
    }
    await toast.hide();
    await showToast(Toast.Style.Success, done);
}

export async function connect(name: string) {
    await run("connect", name, `Connecting to ${name}`, `Connection to ${name} is established.`);
}

export async function disconnect(name: string) {
    await run("disconnect", name, `Disconnecting from ${name}`, `Connection to ${name} is closed.`);
}
