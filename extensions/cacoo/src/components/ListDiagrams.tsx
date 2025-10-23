import { Action, ActionPanel, Grid } from "@raycast/api";
import type { UsePromiseReturnType } from "@raycast/utils";
import {
	type GetDiagramsResponse,
	type GetOrganizationsResponse,
	withApiKey,
} from "../api/cacoo";
import { DiagramDetail } from "./DiagramDetail";

type Props = {
	organizations: GetOrganizationsResponse["result"];
	diagrams: GetDiagramsResponse["result"];
	isLoading: boolean;
	pagination: UsePromiseReturnType<unknown>["pagination"];
	organizationKey: string | null;
	keyword: string;
	onChangeOrganizationKey: (organizationKey: string) => void;
	onChangeKeyword: (keyword: string) => void;
};

export const ListDiagrams = ({
	organizations,
	diagrams,
	isLoading,
	pagination,
	organizationKey,
	keyword,
	onChangeOrganizationKey,
	onChangeKeyword,
}: Props) => {
	return (
		<Grid
			isLoading={isLoading}
			throttle
			searchText={keyword}
			onSearchTextChange={onChangeKeyword}
			pagination={pagination}
			searchBarAccessory={
				organizationKey ? (
					<Grid.Dropdown
						tooltip="Organizations"
						value={organizationKey}
						onChange={onChangeOrganizationKey}
					>
						{organizations.map((organization) => (
							<Grid.Dropdown.Item
								key={organization.id}
								title={organization.name}
								value={organization.key}
							/>
						))}
					</Grid.Dropdown>
				) : null
			}
		>
			{diagrams.map((diagram) => (
				<Grid.Item
					key={diagram.diagramId}
					id={diagram.diagramId}
					title={diagram.title}
					subtitle={diagram.description}
					content={withApiKey(diagram.imageUrlForApi)}
					accessory={{
						icon: diagram.owner.imageUrl,
						tooltip: diagram.owner.nickname,
					}}
					actions={
						<ActionPanel>
							<Action.Push
								title="Show Sheets"
								target={<DiagramDetail diagram={diagram} />}
								icon={{ source: "snippets-16" }}
							/>
							<Action.OpenInBrowser title="Open in Browser" url={diagram.url} />
							<Action.CopyToClipboard
								title="Copy URL"
								content={diagram.url}
								shortcut={{ modifiers: ["cmd"], key: "u" }}
							/>
						</ActionPanel>
					}
				/>
			))}
		</Grid>
	);
};
