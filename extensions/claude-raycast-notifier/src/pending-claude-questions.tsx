import {
  Action,
  ActionPanel,
  Icon,
  List,
  open,
  openCommandPreferences,
} from "@raycast/api";
import { basename } from "node:path";
import { usePromise } from "@raycast/utils";
import {
  loadQuestionRequests,
  type ClaudeQuestionRequest,
} from "./lib/question-response";
import AnswerClaudeQuestion from "./answer-claude-question";

export default function Command() {
  const {
    data: requests = [],
    isLoading,
    revalidate,
  } = usePromise(loadQuestionRequests, []);

  return (
    <List
      isLoading={isLoading}
      navigationTitle="Pending Agent Questions"
      searchBarPlaceholder="Search pending questions"
    >
      {requests.length === 0 && !isLoading ? (
        <List.EmptyView
          title="No pending agent questions"
          description="When Claude or Gemini asks for input, the pending question will appear here."
          actions={
            <ActionPanel>
              <Action
                title="Refresh"
                icon={Icon.ArrowClockwise}
                onAction={() => revalidate()}
              />
              <Action
                title="Setup Hooks"
                icon={Icon.WrenchScrewdriver}
                onAction={() =>
                  open(
                    "raycast://extensions/lee_fulln/claude-raycast-notifier/setup-hooks",
                  )
                }
              />
              <Action
                title="Open Preferences"
                icon={Icon.Gear}
                onAction={openCommandPreferences}
              />
            </ActionPanel>
          }
        />
      ) : null}
      {requests.map((request) => (
        <List.Section
          key={request.requestId}
          title={`${providerLabel(request)} · ${buildSourceTitle(request)}`}
          subtitle={buildSourceDetail(request) || undefined}
        >
          {request.questions.map((question, index) => (
            <List.Item
              key={`${request.requestId}:${index}`}
              icon={providerIcon(request)}
              title={question.header ?? `Question ${index + 1}`}
              subtitle={question.prompt}
              accessories={[
                { tag: providerLabel(request) },
                { text: `${question.choices.length} options` },
                ...(question.multiSelect ? [{ text: "multi" }] : []),
              ]}
              actions={
                <ActionPanel>
                  <Action.Push
                    title="Answer Question"
                    icon={Icon.CheckCircle}
                    target={
                      <AnswerClaudeQuestion
                        requestOverride={request}
                        returnToPending
                        pendingCount={requests.length}
                      />
                    }
                  />
                  <Action
                    title="Refresh"
                    icon={Icon.ArrowClockwise}
                    onAction={() => revalidate()}
                  />
                </ActionPanel>
              }
            />
          ))}
        </List.Section>
      ))}
    </List>
  );
}

function providerLabel(request: ClaudeQuestionRequest) {
  const source = (request.source ?? "claude").toLowerCase();
  if (source === "gemini") return "Gemini";
  return "Claude";
}

function providerIcon(request: ClaudeQuestionRequest) {
  const source = (request.source ?? "claude").toLowerCase();
  return source === "gemini" ? Icon.Stars : Icon.Terminal;
}

function buildSourceTitle(request: ClaudeQuestionRequest) {
  if (request.cwd) {
    return basename(request.cwd) || request.cwd;
  }
  return `Current ${providerLabel(request)} session`;
}

function buildSourceDetail(request: ClaudeQuestionRequest) {
  const parts: string[] = [];
  if (request.sessionId) parts.push(`session ${request.sessionId.slice(-8)}`);
  if (request.toolUseId) parts.push(`tool ${request.toolUseId.slice(-8)}`);
  return parts.join(" · ");
}
