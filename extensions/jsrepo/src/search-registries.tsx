import {
	Action,
	ActionPanel,
	getPreferenceValues,
	Icon,
	List,
	showToast,
	useNavigation,
} from "@raycast/api";
import BlocksList from "./components/blocks-list";
import { useEffect, useState } from "react";
import { selectProvider, type Manifest } from "jsrepo";
import { useFrecencySorting, usePromise } from "@raycast/utils";
import { CREATE_ERROR_TOAST_OPTIONS } from "./constants";
import { useRecents } from "./utils/recents";

export type RegistryInfo = {
	manifest: Manifest;
	readme: string | undefined;
};

type RegistryResponse = {
	registries:
		| (RegistryInfo & { url: string; provider: string })[]
		| { url: string; provider: string }[];
	hasMore: boolean;
};

export default function ViewRegistries() {
	const [searchText, setSearchText] = useState("");
	const [isAdding, setIsAdding] = useState(false);
	const [hasExactMatch, setHasExactMatch] = useState(false);

	const navigation = useNavigation();

	const preferences = getPreferenceValues<Preferences>();

	const {
		data: recents,
		addRecent,
		removeRecent,
	} = useRecents<{
		id: string;
		url: string;
		provider: string;
	}>("search-registries");

	const {
		data: sortedRecents,
		visitItem,
		resetRanking,
	} = useFrecencySorting<{ id: string; url: string; provider: string }>(
		recents,
		{ key: (item) => item.id },
	);

	const { isLoading, data, pagination, revalidate } = usePromise(
		(searchText: string, orderBy: string) =>
			async (options: { page: number }) => {
				const limit = 20;

				try {
					const response = await fetch(
						`https://jsrepo.dev/api/registries?with_data=false&offset=${options.page * limit}&limit=${limit}&query=${searchText}&order_by=${orderBy}&order=${orderBy === "views" ? "desc" : "asc"}`,
					);

					const newData = (await response.json()) as RegistryResponse;

					return {
						data: newData.registries.map((r) => ({
							...r,
							id: r.url,
						})),
						hasMore: newData.hasMore,
					};
				} catch {
					showToast(
						CREATE_ERROR_TOAST_OPTIONS("error fetching registries"),
					);

					return { data: [], hasMore: false };
				}
			},
		[searchText, preferences.orderBy],
	);

	async function addNew() {
		const provider = selectProvider(searchText);

		if (!provider) {
			showToast(CREATE_ERROR_TOAST_OPTIONS("invalid url!"));
			return;
		}

		const url = provider.parse(searchText, { fullyQualified: false }).url;

		setIsAdding(true);

		try {
			const response = await fetch("https://jsrepo.dev/api/registries", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ url }),
			});

			if (response.ok) {
				navigation.push(<BlocksList registryUrl={url} />);
			} else {
				throw new Error();
			}

			addRecent({ id: url, url, provider: provider.name });

			revalidate();
		} catch {
			showToast(CREATE_ERROR_TOAST_OPTIONS("error adding registry"));
		} finally {
			setIsAdding(false);
		}
	}

	useEffect(() => {
		const match = data?.find(
			(r) =>
				r.url.trim().toLowerCase() === searchText.trim().toLowerCase(),
		);

		setHasExactMatch(match !== undefined);
	}, [searchText, data]);

	return (
		<List
			onSearchTextChange={setSearchText}
			isLoading={isLoading || isAdding}
			pagination={pagination}
			throttle={true}
			searchBarPlaceholder="Enter a registry URL... (e.g. github/ieedan/std)"
		>
			{sortedRecents.length > 0 && (
				<List.Section title="Recents">
					{sortedRecents
						.filter((reg) => reg.url.startsWith(searchText))
						.map((reg) => (
							<List.Item
								key={reg.url}
								icon={`providers/${reg.provider}.svg`}
								title={reg.url}
								actions={
									<ActionPanel>
										<ActionPanel.Section>
											<Action.Push
												title="View Blocks"
												target={
													<BlocksList
														registryUrl={reg.url}
													/>
												}
												onPush={() => {
													visitItem(reg);
												}}
											/>
											<Action.OpenInBrowser
												title="View Registry Docs"
												url={`https://jsrepo.dev/registry?url=${reg.url}`}
												onOpen={() => {
													visitItem(reg);
												}}
											/>
										</ActionPanel.Section>
										<ActionPanel.Section>
											<Action
												title="Reset Ranking"
												icon={
													Icon.ArrowCounterClockwise
												}
												onAction={() =>
													resetRanking(reg)
												}
											/>
											<Action
												title="Remove from Recents"
												style={Action.Style.Destructive}
												icon={Icon.XMarkCircle}
												onAction={() => {
													resetRanking(reg);
													removeRecent(reg);
												}}
											/>
										</ActionPanel.Section>
									</ActionPanel>
								}
							/>
						))}
				</List.Section>
			)}
			<List.Section title="Registries">
				{data &&
					data.length > 0 &&
					data.map((reg) => (
						<List.Item
							key={reg.url}
							icon={`providers/${reg.provider}.svg`}
							title={reg.url}
							actions={
								<ActionPanel>
									<Action.Push
										title="View Blocks"
										target={
											<BlocksList registryUrl={reg.url} />
										}
										onPush={() => {
											addRecent(reg);
											visitItem(reg);
										}}
									/>
									<Action.OpenInBrowser
										title="View Registry Docs"
										url={`https://jsrepo.dev/registry?url=${reg.url}`}
										onOpen={() => {
											addRecent(reg);
											visitItem(reg);
										}}
									/>
								</ActionPanel>
							}
						/>
					))}
			</List.Section>
			{!hasExactMatch &&
				searchText.trim().length !== 0 &&
				selectProvider(searchText) !== undefined && (
					<List.Item
						icon={Icon.Plus}
						title="Add Registry"
						subtitle={searchText}
						actions={
							<ActionPanel>
								<Action.SubmitForm onSubmit={addNew} />
							</ActionPanel>
						}
					/>
				)}
		</List>
	);
}
