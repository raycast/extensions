import { Action, ActionPanel, AI, clearSearchBar, Icon, List, useNavigation } from "@raycast/api";
import { useCallback, useState } from "react";
import { SlackStatusForm } from "./status-form.component";
import { showToastWithPromise } from "../../utils/toast.util";

type AIAnswerType = Pick<SlackStatusForm, "statusText" | "emoji" | "expiration">;

interface SetStatusWithAIActionProps {
  inputText: string;
  onSubmit: (form: AIAnswerType) => void;
}

function SetStatusWithAIAction({ inputText, onSubmit }: SetStatusWithAIActionProps) {
  const { pop } = useNavigation();

  const onAction = useCallback(async () => {
    await showToastWithPromise(
      async () => {
        const answer = await AI.ask(
          `You help a Slack user set their status.
              
              **Respond with a JSON object with the following attributes:**
              - "text": a string value for status text, should be short and sweet, with no punctuation, e.g. "Working out", "Listening to Drake's new album", "Coffee break". It should not include the status duration for example "Working out" instead of "Working out for 2 hours" or "Working out until tomorrow".
              - "emoji": a Slack-compatible string for single emoji matching the text of the status. Emojis should be in the form: :<emoji identifier>:

              **If the user has specified a time or the end of status in their description then add the following attribute:**
              - "duration": an integer representing the duration of the status in seconds

              Rules:
              - Response should be a string without any template quotes for formatting.
              - all strings should use double quotation marks and should have .trim() applied
              - all emojis should be in form :<emoji identifier>:
              - all attributes should be wrapped with double quotation marks
              - all spaces and carriage returns should be removed from the resulting string

              Current time of user's status: ${new Date().toLocaleTimeString()}. User's description of their status: ${
                inputText
              }. 

              Your suggested Slack status:`,
          { creativity: "low" },
        );

        const parsedAnswer = JSON.parse(answer.replace(/```json\n?|```/g, "").trim());

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
      },
      {
        success: "The status value has been created. Please wait a moment.",
        error: "An error occurred while the AI was generating the status value.",
        loading: "AI is generating status values...",
      },
    );
  }, [onSubmit]);

  return <Action title="Set Status" icon={Icon.Stars} onAction={onAction} />;
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
