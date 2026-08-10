import { LexiconDoc } from "@atproto/lexicon";
import { Action, ActionPanel, List } from "@raycast/api";
import { DefOverviewDetail } from "./DefOverviewDetail";
import { useState } from "react";

export const linkLexicon = (lexiconName: string) =>
	`https://github.com/bluesky-social/atproto/tree/main/lexicons/${lexiconName.replaceAll(".", "/")}.json`;

export function LexiconDefsList({ doc, initialSearchText = "" }: { doc: LexiconDoc; initialSearchText?: string }) {
	const [searchText, setSearchText] = useState(initialSearchText);
	return (
		<List
			searchBarPlaceholder="Search lexicons..."
			searchText={searchText}
			onSearchTextChange={(text) => setSearchText(text)}
			isLoading={false}
			filtering={true}
			isShowingDetail={true}
			navigationTitle={doc.id}
		>
			<List.Section title={doc.id}>
				{Object.entries(doc.defs).map(([key, def]) => (
					<List.Item
						key={key}
						id={key}
						title={"#" + key}
						actions={
							<ActionPanel>
								<Action.OpenInBrowser title="View on GitHub" url={linkLexicon(doc.id)} />
								<Action.CopyToClipboard
									title="Copy NSID"
									content={doc.id}
									shortcut={{ modifiers: ["cmd", "ctrl"], key: "c" }}
								/>
							</ActionPanel>
						}
						detail={<DefOverviewDetail def={def} lexiconName={doc.id} />}
					/>
				))}
			</List.Section>
		</List>
	);
}
