import { Clipboard, List, ActionPanel, Action, Detail } from "@raycast/api";
import { execFile, ExecFileException } from "child_process";
import { useCallback, useEffect, useState } from "react";
import { ESSE_ACTIONS } from "./esse-items";

const CACHE: { [key: string]: string } = {};

async function runEsseAsync(
	input: string,
	transformationId: string,
	setError: (_: ExecFileException) => void,
	callback: (_: string) => void
) {
	const cached_value = CACHE[transformationId];
	if (cached_value !== undefined) {
		callback(cached_value);
		return;
	}

	const proc = execFile(
		"/Applications/Esse.app/Contents/MacOS/EsseCommandLine",
		["-t", transformationId, "-i", input],
		{ env: {}, encoding: "utf8" },
		(error, stdout, _stderr) => {
			console.log(`ran esse with ${transformationId}`);
			if (error) {
				setError(error);
			}

			CACHE[transformationId] = stdout;
			callback(stdout);
		}
	);
	proc.stdin?.end();

	// return stdout;
}

function textToMarkdown(input: string): string {
	// return input.replace(/([`*_()[\]])|(^(?:[#-+*]|>+))|(?:^\d+(\.))/g, (_match, group) => `\\${group}`);
	return `\`\`\`text\n${input}\n\`\`\``;
}

type Result = { transformedText: string; markdown: string };

export default function Command() {
	// IGNORE COMMENT \
	// "Prime the pump", as it were. The first call to execFile (and related methods) is
	// very slow; subsequent calls are faster. So we throw in a fake async call at the
	// beginning to speed up the subsequent ones \
	// END IGNORE

	const defaultActionId = ESSE_ACTIONS[0].items[0].id;

	const [textInfo, setTextInfo] = useState({ text: "", clipboardWasRead: false });
	const [actionId, setActionId] = useState(defaultActionId);

	const [isLoading, setIsLoading] = useState(true);

	const initialResult = { transformedText: textInfo.text, markdown: "Loading..." };
	const [result, setResult] = useState(initialResult);

	const [error, setError] = useState<ExecFileException | undefined>();

	useEffect(() => {
		function finish(result: Result) {
			setResult(result);
			setIsLoading(false);
		}

		const { text, clipboardWasRead } = textInfo;
		setIsLoading(true);

		if (clipboardWasRead && text.length === 0) {
			finish({
				transformedText: "",
				markdown: "<no text on clipboard>",
			});
		} else if (!clipboardWasRead) {
			finish(initialResult);
		} else {
			runEsseAsync(text, actionId, setError, (transformedText) => {
				const markdown = textToMarkdown(transformedText);
				finish({ transformedText, markdown });
			});
		}
	}, [textInfo, actionId]);

	// TODO: add `getSelectedText` here as well, before Clipboard.readText() \
	// Currently this results in the error `Cannot copy selected text from frontmost
	// application.`
	useEffect(() => {
		Promise.all([Clipboard.readText()]).then(([clipboard]) => {
			setTextInfo({ text: clipboard ?? "", clipboardWasRead: true });
		});
	}, [textInfo.clipboardWasRead]);

	const onSelectionChange = useCallback(
		(actionId: string | null) => {
			actionId = actionId ?? defaultActionId;
			setActionId(actionId);
		},
		[actionId]
	);

	return error !== undefined ? (
		(() => {
			const markdown = `# Error: Esse not installed

To use this extension, you must first install the Esse app from its
[GitHub repository](https://github.com/amebalabs/Esse). See the README for more info.`;

			return <Detail markdown={markdown}></Detail>;
		})()
	) : (
		<List navigationTitle="Esse" isShowingDetail {...{ isLoading, onSelectionChange }}>
			{ESSE_ACTIONS.map(({ category, items }) => {
				return (
					<List.Section title={category} key={category}>
						{items.map(({ id, title, description, autocomplete }) => {
							const subtitle = description ?? autocomplete ?? title;

							return (
								<List.Item
									{...{ id, title }}
									subtitle={{ tooltip: subtitle, value: subtitle }}
									key={id}
									detail={<List.Item.Detail markdown={result.markdown}></List.Item.Detail>}
									keywords={autocomplete}
									actions={
										<ActionPanel title="Actions">
											<Action.CopyToClipboard title="Copy to Clipboard" content={result.transformedText} />
										</ActionPanel>
									}
								></List.Item>
							);
						})}
					</List.Section>
				);
			})}
		</List>
	);
}
