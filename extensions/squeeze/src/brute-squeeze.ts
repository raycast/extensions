import { Clipboard, showToast, Toast } from "@raycast/api";

export default async function Command() {
    try {
        const text = await Clipboard.readText();

        if (!text) {
            await showToast({
                style: Toast.Style.Failure,
                title: "Clipboard is empty",
            });
            return;
        }

        // Remove all whitespace characters (spaces, tabs, line breaks, etc.)
        const processed = text.replace(/\s+/g, "");

        await Clipboard.copy(processed);

        await showToast({
            style: Toast.Style.Success,
            title: "Clipboard text brute squeezed",
        });
    } catch (error) {
        await showToast({
            style: Toast.Style.Failure,
            title: "Failed to process clipboard",
            message: String(error),
        });
    }
}
