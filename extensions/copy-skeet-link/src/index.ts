import { showHUD, Clipboard } from "@raycast/api";

function transformUrl(url: string): string {
    const urlObj = new URL(url);

    if (urlObj.host == "staging.bsky.app") {
        urlObj.host = "bsky.app";
    }
    return `https://skeeet.xyz?url=${urlObj.toString()}`;
}

export default async function main() {
    const input = await Clipboard.read();

    if (!input.text.includes("bsky.app")) {
        await showHUD("Only bsky.app links are supported");
        return;
    }

    if (!input) {
        await showHUD("No input found");
        return;
    }

    const transformed = transformUrl(input.text);

    Clipboard.copy(transformed);
    await showHUD("Copied to clipboard");
}
