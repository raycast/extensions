import { List, showHUD } from "@raycast/api";
import { getFileContent, getLatestDownload, hasAccessToDownloadsFolder } from "./utils";

// async function insertEntry(replaceFrom: string, replaceTo: string) {

// 	const dbPath = path.resolve(homedir(), "Library/KeyboardServices/TextReplacements.db");
// 	const query = `
// 		INSERT INTO ZTEXTREPLACEMENTENTRY
// 			(
// 				Z_ENT,
// 				Z_OPT,
// 				ZNEEDSSAVETOCLOUD,
// 				ZWASDELETED,
// 				ZTIMESTAMP,
// 				ZSHORTCUT,
// 				ZPHRASE,
// 				ZUNIQUENAME,
// 				ZREMOTERECORDINFO
// 			)
// 		VALUES
// 			(
// 				1, -- Z_ENT: every one of my entries is set to 1
// 				1, -- Z_OPT: have no idea
// 				0, -- ZNEEDSSAVETOCLOUD: every one of my entries is set to 0
// 				0, -- ZWASDELETED: (when I delete through system preferences it is actually deleted, not set to 1),
// 				'704665903', -- ZTIMESTAMP: sample from my database, not sure which convention is used (linux epoch points to 1992)
// 				'${replaceFrom}', -- ZSHORTCUT: replace from
// 				'${replaceTo}', -- ZPHRASE: replace to
// 				'UniqueName001', -- looks like a random UUID
// 				'' -- ZREMOTERECORDINFO: that one I have no idea, looks binary and risky
// 		);
// 	`;
// }

export default function Command() {

	// should export JSON to ~/Downloads first
	// open(`raycast://extensions/raycast/snippets/export-snippets`);

	if (!hasAccessToDownloadsFolder()) {
		showHUD("No permission to access the downloads folder");
		return;
	}

	const latestDownload = getLatestDownload();

	if (!latestDownload) {
		showHUD("No downloads found");
		return;
	}

	const replacements = JSON.parse(getFileContent(latestDownload.path));

	return (
		<List>
			{replacements.map((replacement) => (
				<List.Item
					title={replacement.text}
					subtitle={replacement.keyword}
					icon="text-replacement"
				/>
			))}
		</List>
	)
}
