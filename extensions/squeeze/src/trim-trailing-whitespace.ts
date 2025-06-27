import { Clipboard, showToast, Toast } from "@raycast/api";

function trimTrailingWhitespacePerParagraph(text: string) {
    const paragraphs = text.split("\n");
    const trimmed = paragraphs.map((p) => p.trimEnd());
    return trimmed.join("\n");
}

export default async function Command() {
    try {
        const text = await Clipboard.readText();

        if (!text) {
            await showToast({ style: Toast.Style.Failure, title: "Clipboard is empty" });
            return;
        }

        const trimmed = trimTrailingWhitespacePerParagraph(text);

        await Clipboard.copy(trimmed);

        await showToast({
            style: Toast.Style.Success,
            title: "Trailing whitespace trimmed from clipboard",
        });
    } catch (error) {
        await showToast({
            style: Toast.Style.Failure,
            title: "Failed to trim trailing whitespace",
            message: String(error),
        });
    }
}
