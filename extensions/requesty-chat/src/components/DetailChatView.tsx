import { Action, ActionPanel, Detail, Icon } from '@raycast/api';
import { ChatMessage } from '../types';

interface DetailChatViewProps {
	model: string;
	messages: ChatMessage[];
	totalCost: number;
	inputText: string;
	isLoading: boolean;
	onInputChange: (text: string) => void;
	onSendMessage: () => void;
	onSwitchView: () => void;
	onClearChat: () => void;
}

export function DetailChatView({
	model,
	messages,
	totalCost,
	inputText,
	isLoading,
	onInputChange,
	onSendMessage,
	onSwitchView,
	onClearChat,
}: DetailChatViewProps) {
	const markdown = messages
		.map(
			(message) => `
### ${message.role === 'user' ? 'You' : 'AI'} • ${message.timestamp.toLocaleTimeString()}

${message.content}

${message.cost ? `Cost: $${message.cost.toFixed(4)}` : ''}

---
`,
		)
		.join('\n');

	return (
		<Detail
			navigationTitle={`Chat with ${model} • $${totalCost.toFixed(4)}`}
			markdown={markdown}
			isLoading={isLoading}
			actions={
				<ActionPanel>
					<Action
						title="Send Message"
						icon={Icon.Message}
						shortcut={{ modifiers: [], key: 'return' }}
						onAction={onSendMessage}
					/>
					<Action
						title="Switch to List View"
						icon={Icon.List}
						shortcut={{ modifiers: ['cmd'], key: 'l' }}
						onAction={onSwitchView}
					/>
					<Action.CopyToClipboard
						title="Copy Last Message"
						icon={Icon.Clipboard}
						content={messages[messages.length - 1]?.content || ''}
						shortcut={{ modifiers: ['cmd'], key: 'c' }}
					/>
					<Action
						title="Clear Chat"
						icon={Icon.Trash}
						shortcut={{ modifiers: ['cmd', 'shift'], key: 'backspace' }}
						onAction={onClearChat}
					/>
				</ActionPanel>
			}
			metadata={
				<Detail.Metadata>
					<Detail.Metadata.Label title="Model" text={model} />
					<Detail.Metadata.Label title="Total Cost" text={`$${totalCost.toFixed(4)}`} />
					<Detail.Metadata.Label title="Messages" text={messages.length.toString()} />
					<Detail.Metadata.TagList title="Input">
						<Detail.Metadata.TagList.Item
							text={inputText || 'Type your message...'}
							onAction={() => {
								const newText = inputText || '';
								onInputChange(newText);
							}}
						/>
					</Detail.Metadata.TagList>
				</Detail.Metadata>
			}
		/>
	);
}
