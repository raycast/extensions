import { Action, ActionPanel, List } from "@raycast/api";
import { useFetch } from "@raycast/utils";
import { useState } from "react";

export default function Command() {
	const [searchText, setSearchText] = useState("");
	const { data, isLoading } = useFetch(`https://developer.mozilla.org/api/v1/search?q=${searchText}`, {
		parseResponse,
	});

	return (
		<List isLoading={isLoading} throttle onSearchTextChange={setSearchText} searchBarPlaceholder="Search MDN Docs">
			<List.Section title="Results" subtitle={data?.length + ""}>
				{data?.map((result) => (
					<ListItem key={result.title} data={result} />
				))}
			</List.Section>
		</List>
	);
}

function ListItem({ data }: { data: MDNResult }) {
	return (
		<List.Item
			icon="mdn.png"
			title={data.title}
			subtitle={data.summary}
			actions={
				<ActionPanel>
					<ActionPanel.Section>
						<Action.OpenInBrowser title="Open in browser" url={`https://developer.mozilla.org${data.mdn_url}`} />
					</ActionPanel.Section>
				</ActionPanel>
			}
		/>
	);
}

type MDNResult = {
	mdn_url: string;
	score: number;
	title: string;
	popularity: number;
	summary: string;
	highlight: { body: string[]; title: [] };
};

async function parseResponse(res: Response) {
	const json = (await res.json()) as { documents: MDNResult[] } | { code: string; message: string };

	if (!res.ok || "message" in json) throw new Error("message" in json ? json.message : "An error occurred");

	return json.documents;
}
