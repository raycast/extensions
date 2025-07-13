import { Action, ActionPanel, Icon, LaunchProps, List, LocalStorage, useNavigation } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { fetchLexicons, loadLexiconsFromDisk, loadSingleLexicon } from "./util/downloadLexicons";
import { useEffect, useMemo, useState } from "react";
import { LexiconDoc } from "@atproto/lexicon";
import { LexiconDefsList, linkLexicon } from "./components/LexiconDefsList";
import { DefOverviewDetail } from "./components/DefOverviewDetail";

export default function LexiconSearch(props: LaunchProps<{ arguments: Arguments.LexiconSearch }>) {
	const { query } = props.arguments;

	const { push } = useNavigation();

	const [isLoading, setIsLoading] = useState(false);
	const [error, setError] = useState<Error | null>(null);
	const [lexicons, setLexicons] = useState<Record<string, LexiconDoc | null>>({});
	const [searchText, setSearchText] = useState(query || "");
	const [selectedNsid, setSelectedNsid] = useState<string | null>(null);
	const [filter, setFilter] = useState("All");

	useEffect(() => {
		(async function () {
			const lastFetched = (await LocalStorage.getItem<number>("lastFetched")) ?? 0;

			const data = await loadLexiconsFromDisk().catch(() => null);
			if (data) setLexicons(data);
			if (!data || Date.now() - lastFetched > 1000 * 60 * 60) {
				setError(null);
				setIsLoading(true);
				try {
					await fetchLexicons((nsid, doc) => {
						setLexicons((prev) => ({ ...prev, [nsid]: doc }));
					});
				} catch (e) {
					setError(e instanceof Error ? e : new Error("Failed to fetch new lexicon data"));
					await showFailureToast(e, {
						title: "Failed to fetch new lexicon data",
					});
				} finally {
					setIsLoading(false);
				}
			}
		})();
	}, []);

	useEffect(() => {
		if (query?.includes("#")) {
			const [nsid, key] = query.split("#");
			if (lexicons[nsid]) {
				push(<LexiconDefsList doc={lexicons[nsid]} initialSearchText={"#" + key} />);
			}
		}
	}, [lexicons]);

	const extensiveLexiconListing = Object.fromEntries(
		Object.entries(lexicons)
			.filter(([, doc]) => !!doc)
			.flatMap(([nsid, doc]) => {
				return doc?.defs ? Object.entries(doc.defs).map(([key, def]) => [`${nsid}#${key}`, def]) : [];
			}),
	);

	const listToDisplay = useMemo<Record<string, LexiconDoc | LexiconDoc["defs"][string] | null>>(() => {
		let entries: Array<[string, LexiconDoc | LexiconDoc["defs"][string] | null]>;
		if (searchText && lexicons[searchText]) {
			entries = Object.entries(lexicons[searchText].defs).map(([key, def]) => [`${searchText}#${key}`, def]);
		} else if (filter !== "All") {
			entries = Object.entries(extensiveLexiconListing).filter(([, doc]) => doc?.type === filter.toLowerCase());
		} else if (searchText.includes("#")) {
			entries = Object.entries(extensiveLexiconListing);
		} else entries = Object.entries(lexicons);
		return Object.fromEntries(entries.sort(([a], [b]) => a.localeCompare(b)));
	}, [searchText, filter, lexicons, extensiveLexiconListing]);

	const selectedDoc = selectedNsid ? (lexicons[selectedNsid] ?? null) : null;

	return (
		<List
			searchBarPlaceholder="Search lexicons..."
			searchBarAccessory={
				<FilterDropdown
					options={["All", "Query", "Procedure", "Object", "Record", "Array"]}
					setSelected={setFilter}
				/>
			}
			isLoading={isLoading}
			searchText={searchText}
			onSearchTextChange={(text) => setSearchText(text)}
			onSelectionChange={(selection) => setSelectedNsid(selection)}
			isShowingDetail={selectedNsid?.includes("#")}
			filtering
		>
			{Object.entries(listToDisplay).length ? (
				Object.entries(listToDisplay).map(([nsid, document]) => {
					const id = !!document && "id" in document ? document.id : nsid;
					if (!!document && "defs" in document && Object.values(document.defs).length === 1) {
						nsid += "#" + Object.keys(document.defs)[0];
					}
					return (
						<List.Item
							key={nsid}
							id={nsid}
							title={{ tooltip: document?.description, value: nsid }}
							detail={
								nsid.includes("#") ? (
									<DefOverviewDetail def={extensiveLexiconListing[nsid]} lexiconName={id} />
								) : undefined
							}
							actions={
								<ActionPanel title={nsid}>
									{!document ? (
										<Action
											title="Retry"
											onAction={() =>
												loadSingleLexicon(nsid).then((loaded) => {
													if (loaded) {
														setLexicons((prev) => ({ ...prev, [loaded.nsid]: loaded.doc }));
													}
												})
											}
										/>
									) : null}
									{selectedDoc && document ? (
										<Action.Push title="Open" target={<LexiconDefsList doc={selectedDoc} />} />
									) : null}
									{nsid.includes("#") ? (
										<Action.OpenInBrowser title="View on GitHub" url={linkLexicon(id)} />
									) : null}
									{document ? (
										<Action.CopyToClipboard
											title="Copy NSID"
											content={nsid}
											shortcut={{ modifiers: ["cmd", "ctrl"], key: "c" }}
										/>
									) : null}
								</ActionPanel>
							}
							accessories={
								document
									? undefined
									: [{ icon: Icon.ExclamationMark, tooltip: "Failed to load. Press enter to retry." }]
							}
						/>
					);
				})
			) : isLoading ? (
				<List.EmptyView title="Loading lexicons..." description="This might take a bit!" />
			) : (
				<List.EmptyView title="Failed to load lexicons" description={error?.message} />
			)}
		</List>
	);
}

function FilterDropdown({ options, setSelected }: { options: string[]; setSelected: (value: string) => void }) {
	return (
		<List.Dropdown tooltip="Type" defaultValue={options[0]} onChange={setSelected}>
			{options.map((option) => (
				<List.Dropdown.Item key={option} title={option} value={option} />
			))}
		</List.Dropdown>
	);
}
