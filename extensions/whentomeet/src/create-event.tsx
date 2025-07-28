import { useState } from "react";
import { Action, ActionPanel, Form, showToast, Toast, Icon } from "@raycast/api";
import { useAI } from "@raycast/utils";

export default function Command() {
  const [query, setQuery] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const {
    data,
    isLoading: aiLoading,
    error,
  } = useAI(query ? `@whentomeet ${query}` : "", {
    execute: !!query,
  });

  const handleSubmit = async () => {
    if (!query.trim()) {
      await showToast({
        style: Toast.Style.Failure,
        title: "No query provided",
        message: "Please describe the event you want to create",
      });
      return;
    }

    setIsLoading(true);
    // The AI will handle the event creation through the tools
    // We just need to trigger the AI with the query
  };

  const getPlaceholderText = () => {
    const examples = [
      "Team standup tomorrow at 9am and 10am for 30 minutes",
      "Client meeting next Tuesday 2pm, 3pm, or 4pm for 1 hour",
      "Project kickoff Monday 9am, 10am, and 2pm for 90 minutes",
      "Coffee chat this Friday 3pm to 5pm",
      "Workshop next week Wednesday 1pm for 2 hours",
    ];
    const randomExample = examples[Math.floor(Math.random() * examples.length)];
    return `Describe your event in natural language, e.g., "${randomExample}"`;
  };

  const getActionTitle = () => {
    if (isLoading || aiLoading) return "Creating Event…";
    return "Create WhenToMeet Event";
  };

  const getActionIcon = () => {
    if (isLoading || aiLoading) return Icon.Clock;
    return Icon.Calendar;
  };

  return (
    <Form
      actions={
        <ActionPanel>
          <Action title={getActionTitle()} icon={getActionIcon()} onAction={handleSubmit} />
          {data && (
            <Action.CopyToClipboard
              title="Copy AI Response"
              content={data}
              icon={Icon.Clipboard}
              shortcut={{ modifiers: ["cmd"], key: "c" }}
            />
          )}
        </ActionPanel>
      }
    >
      <Form.TextArea
        id="query"
        title="📝 Describe Your Event"
        placeholder={getPlaceholderText()}
        value={query}
        onChange={setQuery}
        info={
          aiLoading
            ? "🤖 AI is processing your request…"
            : "Use natural language to describe when and what your event is about. The AI will create a WhenToMeet event for you."
        }
      />

      {aiLoading && (
        <>
          <Form.Separator />
          <Form.Description
            title="🤖 AI Processing"
            text="The AI is analyzing your request and will create a WhenToMeet event with appropriate time slots."
          />
        </>
      )}

      {error && (
        <>
          <Form.Separator />
          <Form.Description
            title="❌ Error"
            text={error.message || "An error occurred while processing your request."}
          />
        </>
      )}

      {data && !aiLoading && (
        <>
          <Form.Separator />
          <Form.Description
            title="✅ Event Created"
            text="Your WhenToMeet event has been created and opened in your browser. You can copy the AI response above for reference."
          />
        </>
      )}

      {!data && !aiLoading && query && (
        <>
          <Form.Separator />
          <Form.Description
            title="💡 Tips"
            text="Try being more specific about dates and times. For example: 'Team meeting tomorrow at 2pm and 3pm for 1 hour'"
          />
        </>
      )}
    </Form>
  );
}
