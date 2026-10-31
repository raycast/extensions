import { Action, ActionPanel, Icon, Image, Keyboard, List } from "@raycast/api";
import { CreateWorkspaceForm } from "./create-workspace-form";

export function ManagementItem(props: {
	id: string;
	title: string;
	subtitle?: string;
	icon: Image.ImageLike;
	target: React.ReactNode;
	secondaryAction?: React.ReactNode;
	onRefresh: () => void;
}) {
	return (
		<List.Item
			id={props.id}
			title={props.title}
			subtitle={props.subtitle}
			icon={props.icon}
			actions={
				<ActionPanel>
					<Action.Push title={`Open ${props.title}`} target={props.target} />
					{props.secondaryAction}
					<Action title="Refresh" icon={Icon.ArrowClockwise} onAction={props.onRefresh} />
					<Action.Push
						title="Create Workspace…"
						icon={Icon.Plus}
						shortcut={Keyboard.Shortcut.Common.New}
						target={<CreateWorkspaceForm onChange={props.onRefresh} />}
					/>
				</ActionPanel>
			}
		/>
	);
}
