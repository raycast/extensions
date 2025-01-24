import { List, Icon, Action, ActionPanel } from '@raycast/api';
import React from 'react';
import { ModelSelector } from './ModelSelector';
import { SettingsView } from './SettingsView';

export function QuickActions() {
	return (
		<>
			<List.Item
				icon={Icon.Message}
				title="New Chat"
				accessories={[{ text: '⏎', tooltip: 'Press Enter to start' }]}
				actions={
					<ActionPanel>
						<Action.Push
							title="Select Model"
							icon={Icon.Message}
							target={<ModelSelector showNewChatOnly={true} />}
							shortcut={{ modifiers: [], key: 'return' }}
						/>
					</ActionPanel>
				}
			/>
			<List.Item
				icon={Icon.Gear}
				title="Settings"
				accessories={[{ text: 'API Key & Preferences' }]}
				actions={
					<ActionPanel>
						<Action.Push title="Open Settings" icon={Icon.Gear} target={<SettingsView />} />
					</ActionPanel>
				}
			/>
		</>
	);
}
