import { Action, ActionPanel, Icon, LaunchProps, List, LocalStorage, useNavigation } from "@raycast/api";
import { showFailureToast, usePromise } from "@raycast/utils";
import { fetchLexicons, loadLexiconsFromDisk, loadSingleLexicon } from "./util/downloadLexicons";
import { useEffect, useMemo, useState } from "react";
import { LexiconDoc } from "@atproto/lexicon";
import { LexiconDefsList, linkLexicon } from "./components/LexiconDefsList";
import { DefOverviewDetail } from "./components/DefOverviewDetail";

export default function Search(props: LaunchProps<{ arguments: Arguments.Search }>) {
	const { query } = props.arguments;

	const { push } = useNavigation();

	const { isLoading: loadingFromDisk, data } = usePromise(loadLexiconsFromDisk, [], {
		onData: (data) => void (data && setLexicons(data)),
		// eslint-disable-next-line @typescript-eslint/no-empty-function
		onError: () => {},
	});

	const [isLoading, setIsLoading] = useState(false);
	const [lexicons, setLexicons] = useState<Record<string, LexiconDoc | null>>({});
	const [searchText, setSearchText] = useState(query || "");
	const [selectedNsid, setSelectedNsid] = useState<string | null>(null);
	const [filter, setFilter] = useState("All");

	useEffect(() => {
		(async function () {
			const lastFetched = (await LocalStorage.getItem<number>("lastFetched")) ?? 0;
			if ((!data && !loadingFromDisk) || Date.now() - lastFetched > 1000 * 60 * 60) {
				setIsLoading(true);
				try {
					setLexicons(await fetchLexicons());
				} catch (e) {
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
		if (query.includes("#")) {
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

	const listToDisplay = useMemo<Record<string, LexiconDoc | LexiconDoc["defs"][string]>>(() => {
		let entries;
		if (searchText && lexicons[searchText]) {
			entries = Object.entries(lexicons[searchText].defs).map(([key, def]) => [`${searchText}#${key}`, def]);
		} else if (filter !== "All") {
			entries = Object.entries(extensiveLexiconListing).filter(([, doc]) => doc?.type === filter.toLowerCase());
		}
		return entries ? Object.fromEntries(entries) : searchText.includes("#") ? extensiveLexiconListing : lexicons;
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
					const id = "id" in document ? document.id : nsid;
					if ("defs" in document && Object.values(document.defs).length === 1) {
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
												loadSingleLexicon(nsid).then((lexicon) => {
													if (lexicon) {
														setLexicons((prev) => ({ ...prev, [nsid]: lexicon }));
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
				<List.EmptyView title="Loading lexicons..." />
			) : (
				<List.EmptyView title="Failed to load lexicons" />
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
