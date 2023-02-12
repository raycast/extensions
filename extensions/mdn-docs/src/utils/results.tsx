import { List, Action, ActionPanel, Icon, Color } from "@raycast/api";
import { MDNResult } from "./types";
import { clearHistory, removeFromHistory } from "./history";
import { useState, useEffect } from "react";

export default function Results({ results: r, inHistory = false }: { results: MDNResult[]; inHistory?: boolean }) {
	const [results, setResults] = useState<MDNResult[]>(r);

	useEffect(() => {
		setResults(r);
	}, [r]);

	return (
		<>
			{results.map((result) => (
				<List.Item
					key={result.mdn_url}
					icon="mdn.svg"
					title={result.title}
					subtitle={result.summary}
					actions={
						<ActionPanel>
							<ActionPanel.Section title="Result">
								<Action.OpenInBrowser title="Open in browser" url={`https://developer.mozilla.org${result.mdn_url}`} />
								<Action.CopyToClipboard title="Copy URL to clipboard" content={`https://developer.mozilla.org${result.mdn_url}`} />
							</ActionPanel.Section>
							<ActionPanel.Section title="History">
								<Action
									title="Clear history"
									onAction={() => {
										if (inHistory) setResults([]);

										clearHistory();
									}}
									icon={{ source: Icon.XMarkCircle, tintColor: Color.Red }}
								/>
								{inHistory ? (
									<Action
										title="Remove from history"
										icon={{ source: Icon.Trash, tintColor: Color.Red }}
										onAction={() => {
											setResults(results.filter((res) => res.mdn_url !== result.mdn_url));

											removeFromHistory(result);
										}}
									/>
								) : null}
							</ActionPanel.Section>
						</ActionPanel>
					}
				/>
			))}
		</>
	);
}
