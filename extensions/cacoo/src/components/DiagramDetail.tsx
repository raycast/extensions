import { Action, ActionPanel, Detail } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import {
	type GetDiagramsResponse,
	getDiagramById,
	withApiKey,
} from "../api/cacoo";

type Props = {
	diagram: GetDiagramsResponse["result"][number];
};

export const DiagramDetail = ({ diagram }: Props) => {
	const { isLoading, data } = useCachedPromise(
		async (diagramId: string) => {
			return getDiagramById({ diagramId });
		},
		[diagram.diagramId],
	);

	console.log(data);

	const markdown = data?.sheets
		.map(({ name, url, imageUrlForApi }) =>
			[`[${name}](${url})`, `![${name}](${withApiKey(imageUrlForApi)})`].join(
				"  \n",
			),
		)
		.join("\n\n---\n\n");

	return (
		<Detail
			isLoading={isLoading}
			navigationTitle={diagram.title}
			markdown={markdown}
			actions={
				<ActionPanel>
					<Action.OpenInBrowser title="Open in Browser" url={diagram.url} />
					<Action.CopyToClipboard
						title="Copy URL"
						content={diagram.url}
						shortcut={{ modifiers: ["cmd"], key: "u" }}
					/>
				</ActionPanel>
			}
		/>
	);
};
