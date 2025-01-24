import { List } from '@raycast/api';
import React from 'react';
import { RecentChats } from './RecentChats';
import { QuickActions } from './QuickActions';
import { ModelSelector } from './ModelSelector';

export function WelcomeScreen() {
	return (
		<List navigationTitle="Requesty Chat" searchBarPlaceholder="Search chats or select an action...">
			<List.Section title="Quick Actions">
				<QuickActions />
			</List.Section>

			<List.Section title="Recent Chats">
				<RecentChats />
			</List.Section>

			<List.Section title="Available Models">
				<ModelSelector />
			</List.Section>
		</List>
	);
}
