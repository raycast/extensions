import { useEffect, useMemo, useState } from "react";
import { Action, ActionPanel, Icon, List } from "@raycast/api";
import { AiDetail } from "./components/AiDetail";
import { useApiSearch } from "./hooks/useApiSearch";
import { useGuideSearch } from "./hooks/useGuideSearch";
import type { DocItem } from "./types";
import { searchApiItems } from "./utils/fetch-api";
import { searchGuideItems } from "./utils/fetch-guides";

type Filter = "all" | "guide" | "api";

const GUIDE_PAGE_SIZE = 50;
const API_PAGE_SIZE = 100;
const PAGINATION_PLACEHOLDERS = 20;

function getModuleImportStatement(module: string): string {
	return `import * as ${module} from "effect/${module}"`;
}

function getGuideSubtitle(item: DocItem): string | undefined {
	if (item.description) return item.description;
	if (item.section) return item.section;

	const pathname = new URL(item.url).pathname.replace(/^\/|\/$/g, "");
	return pathname || undefined;
}

export default function Command() {
	const [filter, setFilter] = useState<Filter>("all");
	const [searchText, setSearchText] = useState("");
	const [guideLimit, setGuideLimit] = useState(GUIDE_PAGE_SIZE);
	const [apiLimit, setApiLimit] = useState(API_PAGE_SIZE);

	const { items: guideItems, isLoading: guideLoading, error: guideError } = useGuideSearch();
	const { items: apiItems, isLoading: apiLoading, error: apiError } = useApiSearch();

	const isLoading = guideLoading || apiLoading;
	const hasError = guideError || apiError;
	const errorDescription = [guideError, apiError]
		.filter((error): error is Error => Boolean(error))
		.map((error) => error.message)
		.join("\n");

	const showGuide = filter === "all" || filter === "guide";
	const showApi = filter === "all" || filter === "api";
	const query = searchText.trim();

	const matchingGuideItems = useMemo(() => searchGuideItems(guideItems, query), [guideItems, query]);
	const matchingApiItems = useMemo(() => searchApiItems(apiItems, query), [apiItems, query]);
	const visibleGuideItems = matchingGuideItems.slice(0, guideLimit);
	const visibleApiItems = matchingApiItems.slice(0, apiLimit);

	useEffect(() => {
		setGuideLimit(GUIDE_PAGE_SIZE);
		setApiLimit(API_PAGE_SIZE);
	}, [filter, query]);

	const hasResults = (showGuide && visibleGuideItems.length > 0) || (showApi && visibleApiItems.length > 0);
	const hasMoreGuideResults = showGuide && visibleGuideItems.length < matchingGuideItems.length;
	const hasMoreApiResults = showApi && visibleApiItems.length < matchingApiItems.length;
	const hasMore = hasMoreGuideResults || hasMoreApiResults;

	function loadMoreResults() {
		if (showGuide) setGuideLimit((limit) => limit + GUIDE_PAGE_SIZE);
		if (showApi) setApiLimit((limit) => limit + API_PAGE_SIZE);
	}

	return (
		<List
			isLoading={isLoading}
			filtering={false}
			onSearchTextChange={setSearchText}
			throttle
			pagination={{
				onLoadMore: loadMoreResults,
				hasMore,
				pageSize: PAGINATION_PLACEHOLDERS,
			}}
			searchBarPlaceholder="Search Effect guides and API reference..."
			searchBarAccessory={
				<List.Dropdown tooltip="Search scope" value={filter} onChange={(v) => setFilter(v as Filter)}>
					<List.Dropdown.Item title="All" value="all" icon={Icon.AppWindowGrid3x3} />
					<List.Dropdown.Item title="Guide" value="guide" icon={Icon.Book} />
					<List.Dropdown.Item title="API Reference" value="api" icon={Icon.Code} />
				</List.Dropdown>
			}
		>
			{hasError ? (
				<List.EmptyView icon={Icon.Warning} title="Failed to load docs" description={errorDescription} />
			) : !hasResults && !isLoading ? (
				<List.EmptyView
					icon={Icon.MagnifyingGlass}
					title="No results found"
					description="Try a different search term or scope"
				/>
			) : (
				<>
					{showGuide && visibleGuideItems.length > 0 && (
						<List.Section title={`Guide (${visibleGuideItems.length} of ${matchingGuideItems.length})`}>
							{visibleGuideItems.map((item) => (
								<List.Item
									key={item.url}
									title={item.title}
									subtitle={getGuideSubtitle(item)}
									keywords={item.section ? [item.section] : []}
									icon={Icon.Book}
									actions={
										<ActionPanel>
											<ActionPanel.Section>
												<Action.OpenInBrowser url={item.url} />
												<Action.Push
													title="Explain with AI"
													icon={Icon.Stars}
													target={
														<AiDetail
															prompt={`You are an expert in Effect-TS. Explain the following guide topic in 2-4 sentences, including what it covers and why it's useful. You can find more details by visiting the provided URL.\n\nTitle: ${item.title}\nURL: ${item.url}`}
															title={`Explain: ${item.title}`}
														/>
													}
													shortcut={{
														modifiers: ["cmd", "shift"],
														key: "e",
													}}
												/>
											</ActionPanel.Section>
											<ActionPanel.Section>
												<Action.CopyToClipboard title="Copy URL" content={item.url} />
											</ActionPanel.Section>
											<ActionPanel.Section>
												<Action
													title="Show All Results"
													icon={Icon.AppWindowGrid3x3}
													onAction={() => setFilter("all")}
													shortcut={{
														modifiers: ["cmd"],
														key: "1",
													}}
												/>
												<Action
													title="Show Guides"
													icon={Icon.Book}
													onAction={() => setFilter("guide")}
													shortcut={{
														modifiers: ["cmd"],
														key: "2",
													}}
												/>
												<Action
													title="Show API Reference"
													icon={Icon.Code}
													onAction={() => setFilter("api")}
													shortcut={{
														modifiers: ["cmd"],
														key: "3",
													}}
												/>
											</ActionPanel.Section>
										</ActionPanel>
									}
								/>
							))}
						</List.Section>
					)}

					{showApi && visibleApiItems.length > 0 && (
						<List.Section title={`API Reference (${visibleApiItems.length} of ${matchingApiItems.length})`}>
							{visibleApiItems.map((item) => (
								<List.Item
									key={`${item.module}.${item.name}`}
									title={item.name}
									subtitle={item.module}
									keywords={[`${item.module}.${item.name}`, item.module]}
									icon={Icon.Code}
									actions={
										<ActionPanel>
											<ActionPanel.Section>
												<Action.OpenInBrowser url={item.url} />
												<Action.Push
													title="Explain with AI"
													icon={Icon.Stars}
													target={
														<AiDetail
															prompt={`You are an expert in Effect-TS. Explain the following API in 2-4 sentences, including what it does, when to use it, and a simple code example. You can find more details by visiting the provided URL.\n\nModule: ${item.module}\nName: ${item.name}\nURL: ${item.url}`}
															title={`Explain: ${item.module}.${item.name}`}
														/>
													}
													shortcut={{
														modifiers: ["cmd", "shift"],
														key: "e",
													}}
												/>
											</ActionPanel.Section>
											<ActionPanel.Section>
												<Action.CopyToClipboard
													title="Copy Module Import"
													content={getModuleImportStatement(item.module)}
													shortcut={{
														modifiers: ["cmd"],
														key: "i",
													}}
												/>
												<Action.CopyToClipboard title="Copy URL" content={item.url} />
											</ActionPanel.Section>
											<ActionPanel.Section>
												<Action
													title="Show All Results"
													icon={Icon.AppWindowGrid3x3}
													onAction={() => setFilter("all")}
													shortcut={{
														modifiers: ["cmd"],
														key: "1",
													}}
												/>
												<Action
													title="Show Guides"
													icon={Icon.Book}
													onAction={() => setFilter("guide")}
													shortcut={{
														modifiers: ["cmd"],
														key: "2",
													}}
												/>
												<Action
													title="Show API Reference"
													icon={Icon.Code}
													onAction={() => setFilter("api")}
													shortcut={{
														modifiers: ["cmd"],
														key: "3",
													}}
												/>
											</ActionPanel.Section>
										</ActionPanel>
									}
								/>
							))}
						</List.Section>
					)}
				</>
			)}
		</List>
	);
}
