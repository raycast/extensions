import { Clipboard, getSelectedText, showToast, Toast } from "@raycast/api";
import { runAppleScript } from "@raycast/utils";

const enChars = "qwertyuiop[]asdfghjkl;'zxcvbnm,./QWERTYUIOP{}ASDFGHJKL:\"ZXCVBNM<>?";
const ukChars = "йцукенгшщзхїфівапролджєячсмитьбю.ЙЦУКЕНГШЩЗХЇФІВАПРОЛДЖЄЯЧСМИТЬБЮ,";
const ignoreChars = ".,";

export default async function main()
{
	const inputText = await getSelectedText();
	await showToast({
		style: Toast.Style.Success,
		title: inputText,
		message: inputText
	});

	if (!inputText)
		return;

	const inputChars = inputText?.split("");
	let outputText = "";

	const isEn = inputChars.some((c) => enChars.includes(c) && !ignoreChars.includes(c));
	if (isEn) {
		for (const c of inputChars) {
			const i = enChars.indexOf(c);
			if (i >= 0) outputText += ukChars[i];
			else outputText += c;
		}
		await Clipboard.paste(outputText);
		await switchLayout();
		return;
	}

	const isUk = inputChars.some((c) => ukChars.includes(c) && !ignoreChars.includes(c));
	if (isUk) {
		for (const c of inputChars) {
			const i = ukChars.indexOf(c);
			if (i >= 0) outputText += enChars[i];
			else outputText += c;
		}
		await Clipboard.paste(outputText);
		await switchLayout();
		return;
	}
}

async function switchLayout()
{
	await runAppleScript(`
		tell application "System Events"
            keystroke space using {control down}
		end tell
	`);
}
