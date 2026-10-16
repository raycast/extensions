import { showToast, Toast } from "@raycast/api";
import { callWireguide } from "./call";

export async function connect(name: string) {
    const toast = await showToast(Toast.Style.Animated, `Connecting to ${name}`);
    await callWireguide("connect", name);
    await toast.hide();
    await showToast(Toast.Style.Success, `Connection to ${name} is established.`);
}

export async function disconnect(name: string) {
    const toast = await showToast(Toast.Style.Animated, `Disconnecting from ${name}`);
    await callWireguide("disconnect", name);
    await toast.hide();
    await showToast(Toast.Style.Success, `Connection to ${name} is closed.`);
}
