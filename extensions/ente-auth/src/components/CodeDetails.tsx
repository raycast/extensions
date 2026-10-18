import { List } from "@raycast/api";
import { TOTPState } from "../cloud/model";
import { JsonFormat } from "../helpers/types";

interface CodeDetailsProps {
	item: JsonFormat;
	state: TOTPState;
}

export function CodeDetails({ item, state }: CodeDetailsProps) {
	const hasNotes = item.notes.trim().length > 0;
	const tags = item.tags.filter((tag) => tag.trim().length > 0);

	return (
		<List.Item.Detail
			metadata={
				<List.Item.Detail.Metadata>
					<List.Item.Detail.Metadata.Label
						key={`current:${item.current_totp}`}
						title="Current"
						text={item.current_totp}
					/>
					<List.Item.Detail.Metadata.Label
						key={`next:${item.next_totp}`}
						title="Next"
						text={item.next_totp}
					/>
					<List.Item.Detail.Metadata.Separator />
					<List.Item.Detail.Metadata.Label
						key={`username:${item.username}`}
						title="Username"
						text={item.username}
					/>
					<List.Item.Detail.Metadata.Label
						key={`algorithm:${item.algorithm}`}
						title="Algorithm"
						text={item.algorithm}
					/>
					<List.Item.Detail.Metadata.Label
						key={`digits:${item.digits}`}
						title="Digits"
						text={String(item.digits)}
					/>
					<List.Item.Detail.Metadata.Label key={`period:${item.period}`} title="Period" text={item.period} />
					{hasNotes && (
						<>
							<List.Item.Detail.Metadata.Separator />
							{/^https?:\/\//.test(item.notes) ? (
								<List.Item.Detail.Metadata.Link
									key={`notes:${item.notes}`}
									title="Notes"
									text={item.notes}
									target={item.notes}
								/>
							) : (
								<List.Item.Detail.Metadata.Label
									key={`notes:${item.notes}`}
									title="Notes"
									text={item.notes}
								/>
							)}
						</>
					)}
					{tags.length > 0 && (
						<>
							<List.Item.Detail.Metadata.Separator />
							<List.Item.Detail.Metadata.TagList title="Tags">
								{tags.map((tag, index) => (
									<List.Item.Detail.Metadata.TagList.Item
										key={`${index}:${tag}`}
										text={tag}
										color="#A400B6"
									/>
								))}
							</List.Item.Detail.Metadata.TagList>
						</>
					)}
					{state.mode === "cloud" && (state.apiOrigin || state.error) && (
						<>
							<List.Item.Detail.Metadata.Separator />
							{state.apiOrigin && (
								<List.Item.Detail.Metadata.Label
									key={`server:${state.apiOrigin}`}
									title="Server"
									text={state.apiOrigin}
								/>
							)}
							{state.error && (
								<List.Item.Detail.Metadata.Label
									key={`sync-error:${state.error}`}
									title="Sync Error"
									text={state.error}
								/>
							)}
						</>
					)}
				</List.Item.Detail.Metadata>
			}
		/>
	);
}
