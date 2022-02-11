import {runAppleScript} from "run-applescript";
import {Clipboard, showHUD, showToast, Toast} from "@raycast/api";

const isEmpty = (string: string) => {
    return string.length === 0;
};

const contents = async () => {
    const clipboard = await runAppleScript("the clipboard");
    if (isEmpty(clipboard)) throw "Clipboard is empty";
    else return clipboard;
};

const update = async (contents: string) => {
    await Clipboard.copy(contents);
    await showHUD("Copied to clipboard");
};

// generate markdown table with row and column count
// 3 x 3 generate:
// |   |   |   |
// |---|---|---|
// |   |   |   |
// |   |   |   |
// |   |   |   |
const generateMarkdownTable = (s: string): string => {
    const splitResult = s.split(' ', 2)
    if (!splitResult || splitResult.length !== 2) throw "Invalid input";

    const rowCount = +splitResult[0].trim()
    const columnCount = +splitResult[1].trim()

    if (isNaN(rowCount) || isNaN(columnCount)) throw "Invalid input";

    const table = []
    {
        const row = []
        const header = []
        for (let j = 0; j < columnCount; j++) {
            row.push(`|   `)
            header.push(`|---`)
        }
        row.push('|')
        header.push('|')
        table.push(row.join(''))
        table.push(header.join(''))
    }

    for (let i = 0; i < rowCount; i++) {
        const row = []
        for (let j = 0; j < columnCount; j++) {
            row.push(`|   `)
        }
        row.push('|')
        table.push(row.join(''))
    }

    return table.join('\n')
}

export default async () => {
    try {
        const clipboard = await contents();
        const res = generateMarkdownTable(clipboard)
        await update(res);
    } catch (e) {
        if (typeof e === "string") {
            await showToast(Toast.Style.Failure, "Decode failed", e);
        }
    }
};

