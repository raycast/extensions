import type { Item } from "../types/devices";

export function isCommandSupported(command: string | undefined, item: Item) {
    if (command === undefined) {
        return true;
    }

    const functions = item.functions ?? [];
    const controls = item.controls ?? [];

    if (functions.length === 0 && controls.length === 0) {
        return true;
    }

    return functions.includes(command) || controls.some(({ type }) => type === command);
}
