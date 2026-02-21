import { Action, ActionPanel, AI, clearSearchBar, Icon, List, useNavigation } from "@raycast/api";
import { useState } from "react";
import { SlackStatusForm } from "./statuts-form.component";

type AIAnswerType = Pick<SlackStatusForm, "statusText" | "emoji" | "expiration">;

interface SetStatusWithAIActionProps {
  inputText: string;
  onSubmit: (form: AIAnswerType) => void;
}

function SetStatusWithAIAction({ inputText, onSubmit }: SetStatusWithAIActionProps) {
  const { pop } = useNavigation();

  return (
    <Action
      title="Set Status"
      icon={Icon.Stars}
      onAction={async () => {
        const answer = await AI.ask(
          `You help a Slack user set their status.

                  **Respond with a minified JSON object with the following attributes:**
                  - "text": a string value for status text. It should be short and sweet, with no punctuation, e.g., "Working out", "Listening to Drake's new album", "Coffee break". It MUST NOT include the status duration (e.g., output "Working out" instead of "Working out for 2 hours").
                  - "emoji": a Slack-compatible string for a single emoji matching the text of the status. Emojis must be in the form: :<emoji identifier>:
                  
                  **If the user has specified a time or the end of their status in the description, add the following attribute:**
                  - "duration": an integer representing the calculated duration of the status in seconds, starting from the Current Time provided below.
                  
                  Rules:
                  - Output ONLY valid minified JSON. Do not use Markdown code blocks (\`\`\`json) or template quotes.
                  - Do not include any explanations or conversational text.
                  - All strings must use double quotation marks and must not have leading or trailing whitespace.
                  - Remove all unnecessary carriage returns and whitespace outside of string values to keep the JSON minified.
                  
                  Current time of user's status: ${new Date().toLocaleTimeString()}
                  User's description of their status: ${inputText}
                  
                  Your suggested Slack status (JSON only):`,
          { creativity: "low" },
        );

        const parsedAnswer = JSON.parse(answer);

        if (typeof parsedAnswer.emoji !== "string" || typeof parsedAnswer.text !== "string") {
          throw new Error("AI generated invalid status 🤷");
        }

        const response: AIAnswerType = {
          emoji: parsedAnswer.emoji,
          statusText: parsedAnswer.text,
          expiration:
            parsedAnswer.duration && typeof parsedAnswer.duration === "number"
              ? new Date().getTime() / 1000 + parsedAnswer.duration
              : 0,
        };

        await clearSearchBar();
        onSubmit(response);
        pop();
      }}
    />
  );
}

function SetAiStatusForm({ onSubmit }: Pick<SetStatusWithAIActionProps, "onSubmit">) {
  const [searchText, setSearchText] = useState<string>();

  return (
    <List onSearchTextChange={setSearchText}>
      <List.EmptyView
        icon={Icon.Stars}
        title={searchText ? `Set status to '${searchText}'` : undefined}
        description="Raycast AI picks the best emoji, text and duration for your status"
        actions={
          <ActionPanel>
            {searchText && <SetStatusWithAIAction inputText={searchText} onSubmit={onSubmit} />}
          </ActionPanel>
        }
      />
    </List>
  );
}

SetAiStatusForm.displayName = "SetAiStatusForm";

export default SetAiStatusForm;
