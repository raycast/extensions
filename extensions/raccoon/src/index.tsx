import { Action, ActionPanel, Icon, Keyboard, List } from "@raycast/api";
import { COMMANDS, type RccCommand } from "./commands";
import { iconFor } from "./command-icons";
import { hasView, isHidden, viewFor } from "./views";

function accessories(command: RccCommand): List.Item.Accessory[] {
	const items: List.Item.Accessory[] = [];
	// Privileged commands still run inside Raycast: rcc raises its own Touch ID
	// dialog. Flag them so the prompt is not a surprise.
	if (command.needsRoot) {
		items.push({
			icon: Icon.Fingerprint,
			tooltip: "Asks for admin rights via Touch ID",
		});
	}
	items.push({ tag: `rcc ${command.args.join(" ")}` });
	return items;
}

export default function Command() {
	return (
		<List searchBarPlaceholder="Search Raccoon commands">
			{COMMANDS.filter((command) => !isHidden(command)).map((command) => (
				<List.Item
					key={command.id}
					icon={iconFor(command.id)}
					title={command.title}
					subtitle={command.description}
					accessories={accessories(command)}
					actions={
						<ActionPanel>
							<Action.Push
								title={
									hasView(command) ? "Open" : "Show Output"
								}
								icon={
									hasView(command)
										? Icon.AppWindowList
										: Icon.Text
								}
								target={viewFor(command)}
							/>
							<Action.CopyToClipboard
								title="Copy Command"
								content={`rcc ${command.args.join(" ")}`}
								shortcut={Keyboard.Shortcut.Common.Copy}
							/>
						</ActionPanel>
					}
				/>
			))}
		</List>
	);
}
