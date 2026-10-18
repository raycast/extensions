import { List } from "@raycast/api";
import { TOTPState } from "../cloud/model";
import { JsonFormat } from "../helpers/types";

interface CodeDetailsProps {
	item: JsonFormat;
	state: TOTPState;
	lastSync: string;
}

export function CodeDetails({ item, state, lastSync }: CodeDetailsProps) {
	return (
		<List.Item.Detail
			markdown={`# ${item.current_totp_time_remaining}s`}
			metadata={
				<List.Item.Detail.Metadata>
					<List.Item.Detail.Metadata.Label title="Current" text={item.current_totp} />
					<List.Item.Detail.Metadata.Label title="Next" text={item.next_totp} />
					{state.mode === "cloud" && (
						<>
							<List.Item.Detail.Metadata.Separator />
							<List.Item.Detail.Metadata.Label title="Sync" text={state.status} />
							{state.apiOrigin && <List.Item.Detail.Metadata.Label title="Server" text={state.apiOrigin} />}
							<List.Item.Detail.Metadata.Label title="Last Sync" text={lastSync} />
							{state.error && <List.Item.Detail.Metadata.Label title="Sync Error" text={state.error} />}
						</>
					)}
					<List.Item.Detail.Metadata.Separator />
					<List.Item.Detail.Metadata.Label title="Username" text={item.username} />
					<List.Item.Detail.Metadata.Label title="Algorithm" text={item.algorithm} />
					<List.Item.Detail.Metadata.Label title="Digits" text={String(item.digits)} />
					<List.Item.Detail.Metadata.Label title="Period" text={item.period} />
					{/^https?:\/\//.test(item.notes) ? (
						<List.Item.Detail.Metadata.Link title="Notes" text={item.notes} target={item.notes} />
					) : (
						<List.Item.Detail.Metadata.Label title="Notes" text={item.notes} />
					)}
					<List.Item.Detail.Metadata.TagList title="Tags">
						{item.tags.map((tag, index) => (
							<List.Item.Detail.Metadata.TagList.Item key={index} text={tag} color="#A400B6" />
						))}
					</List.Item.Detail.Metadata.TagList>
				</List.Item.Detail.Metadata>
			}
		/>
	);
}
