import { Action, ActionPanel, Detail, environment, AI } from "@raycast/api";
import { useAI } from "@raycast/utils";

const DISCORD_URL = "https://discord.gg/effect-ts";

type Props = {
	prompt: string;
	title?: string;
	onAskAnother?: () => void;
};

export function AiDetail({ prompt, title, onAskAnother }: Props) {
	const canAccessAI = environment.canAccess(AI);

	if (!canAccessAI) {
		return (
			<Detail
				navigationTitle={title || "Effect AI"}
				markdown={`# Effect AI Assistant

Sorry, the AI assistant requires **Raycast Pro**.

You can upgrade your Raycast plan to get access to AI features, or ask your question in the [Effect Discord](${DISCORD_URL}).`}
				actions={
					<ActionPanel>
						{onAskAnother && <Action title="Ask Another Question" onAction={onAskAnother} />}
						<Action.OpenInBrowser title="Open Effect Discord" url={DISCORD_URL} />
						<Action.CopyToClipboard title="Copy Discord URL" content={DISCORD_URL} />
					</ActionPanel>
				}
			/>
		);
	}

	return <AiResponse prompt={prompt} title={title} onAskAnother={onAskAnother} />;
}

function AiResponse({ prompt, title, onAskAnother }: Props) {
	const { data, isLoading, error } = useAI(prompt, {
		model: AI.Model["OpenAI_GPT-5_mini"],
		creativity: "low",
	});

	if (error) {
		return (
			<Detail
				navigationTitle={title || "Effect AI"}
				markdown={`# Effect AI Assistant\n\nFailed to generate a response.\n\n**Error:** ${error.message}`}
				actions={
					<ActionPanel>
						{onAskAnother && <Action title="Ask Another Question" onAction={onAskAnother} />}
						<Action.CopyToClipboard title="Copy Error" content={error.message} />
					</ActionPanel>
				}
			/>
		);
	}

	const markdown = data ? data : isLoading ? "Thinking..." : "No response returned.";

	return (
		<Detail
			navigationTitle={title || "Effect AI"}
			isLoading={isLoading}
			markdown={markdown}
			actions={
				<ActionPanel>
					{onAskAnother && (
						<ActionPanel.Section>
							<Action title="Ask Another Question" onAction={onAskAnother} />
						</ActionPanel.Section>
					)}
					{data && (
						<ActionPanel.Section>
							<Action.CopyToClipboard title="Copy Response" content={data} />
						</ActionPanel.Section>
					)}
				</ActionPanel>
			}
		/>
	);
}
