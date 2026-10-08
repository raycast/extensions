import type { Block } from "jsrepo";
import { parseFileExtension } from "./jsrepo";
import * as u from "../utils/url";
import * as l from "../utils/lines";

export function generateMarkdownContent(
	url: string,
	block: Block,
	files: { name: string; code: string }[],
	maximumPreviewLOC?: number,
) {
	const specifier = `${block.category}/${block.name}`;

	return `# ${specifier}
\`\`\`sh
jsrepo add ${u.join(url, specifier)}
\`\`\`

${files
	.map((file, i) => {
		const lang = parseFileExtension(file.name);
		const shortcut = i <= 9 ? `\`⌘ ${i}\`` : "";
		const code = trimCodeToLength(file.code, maximumPreviewLOC);

		return `### ${file.name} ${shortcut}
${codeBlock(code, lang)}`;
	})
	.join("\n\n")}`;
}

export function codeBlock(code: string, lang: string) {
	return `\`\`\`${lang}
${code}
\`\`\``;
}

export function trimCodeToLength(code: string, maximumLOC?: number) {
	let trimmed = code;

	if (maximumLOC !== undefined) {
		if (maximumLOC <= 0) return trimmed;

		const lines = l.get(trimmed);

		const overLimit = lines.length > maximumLOC;

		if (!overLimit) return trimmed;

		trimmed = l.join([...lines.slice(0, maximumLOC), "..."]);
	}

	return trimmed;
}
