import {
  Action,
  ActionPanel,
  closeMainWindow,
  Form,
  Icon,
  List,
  LaunchProps,
  open,
  showHUD,
} from "@raycast/api";
import { basename } from "node:path";
import { useMemo } from "react";
import {
  decodeQuestionPayload,
  writeQuestionResponse,
  removeQuestionRequest,
  type ClaudeQuestionRequest,
} from "./lib/question-response";

type Arguments = { payload: string };
type FormValues = Record<string, string | string[]>;
type ResolvedRequest = {
  request: ClaudeQuestionRequest;
  returnToPending: boolean;
  pendingCount: number;
};

export default function Command(
  props:
    | LaunchProps<{ arguments: Arguments }>
    | {
        requestOverride: ClaudeQuestionRequest;
        returnToPending?: boolean;
        pendingCount?: number;
      },
) {
  const { request, returnToPending, pendingCount } = resolveRequest(props);
  if (!request) return null;

  if (!Array.isArray(request.questions) || request.questions.length === 0) {
    void showHUD("No questions to answer");
    void closeMainWindow();
    return null;
  }

  if (
    request.questions.length === 1 &&
    request.questions[0] &&
    !request.questions[0].multiSelect &&
    request.questions[0].choices.length > 0
  ) {
    return (
      <SingleChoiceList
        request={request}
        field={request.questions[0]}
        returnToPending={returnToPending}
        pendingCount={pendingCount}
      />
    );
  }

  return (
    <QuestionForm
      request={request}
      returnToPending={returnToPending}
      pendingCount={pendingCount}
    />
  );
}

function resolveRequest(
  props:
    | LaunchProps<{ arguments: Arguments }>
    | {
        requestOverride: ClaudeQuestionRequest;
        returnToPending?: boolean;
        pendingCount?: number;
      },
) {
  if ("requestOverride" in props) {
    return {
      request: props.requestOverride,
      returnToPending: props.returnToPending ?? false,
      pendingCount: props.pendingCount ?? 0,
    };
  }

  try {
    return {
      request: decodeQuestionPayload(props.arguments.payload),
      returnToPending: false,
      pendingCount: 0,
    };
  } catch {
    void showHUD("Invalid question payload");
    void closeMainWindow();
    return { request: null, returnToPending: false, pendingCount: 0 };
  }
}

async function submitRequestAnswers({
  request,
  answers,
  returnToPending,
  pendingCount,
}: {
  request: ClaudeQuestionRequest;
  answers: Record<string, string | string[]>;
  returnToPending: boolean;
  pendingCount: number;
}) {
  await writeQuestionResponse({
    requestId: request.requestId,
    status: "submitted",
    submittedAt: new Date().toISOString(),
    answers,
  });
  await removeQuestionRequest(request);
  await finish(
    request.returnUrl,
    `Answer sent to ${providerLabel(request)}`,
    returnToPending,
    pendingCount,
  );
}

async function cancelRequest({
  request,
  returnToPending,
  pendingCount,
}: ResolvedRequest) {
  await writeQuestionResponse({
    requestId: request.requestId,
    status: "cancelled",
    submittedAt: new Date().toISOString(),
  });
  await removeQuestionRequest(request);
  await finish(
    request.returnUrl,
    `${providerLabel(request)} question cancelled`,
    returnToPending,
    pendingCount,
  );
}

function SingleChoiceList({
  request,
  field,
  returnToPending,
  pendingCount,
}: {
  request: ClaudeQuestionRequest;
  field: ClaudeQuestionRequest["questions"][number];
  returnToPending: boolean;
  pendingCount: number;
}) {
  const sectionTitle = buildSourceTitle(request);
  const detailMarkdown = buildQuestionMarkdown(field, request);
  const showDetail = true;

  return (
    <List
      isShowingDetail={showDetail}
      navigationTitle={buildNavigationTitle(request)}
      searchBarPlaceholder="Search options"
    >
      <List.Section
        title={`${providerLabel(request)} · ${sectionTitle}`}
        subtitle={
          showDetail ? field.prompt : buildSourceDetail(request) || field.prompt
        }
      >
        <List.Item
          key="custom-answer"
          icon={Icon.Pencil}
          title="Write Custom Answer"
          subtitle={`Send free-form text back to ${providerLabel(request)}`}
          detail={
            showDetail ? (
              <List.Item.Detail
                markdown={`${detailMarkdown}\n\n## Custom Answer\n\nChoose this item to type any reply instead of selecting a predefined option.`}
              />
            ) : undefined
          }
          actions={
            <ActionPanel>
              <Action.Push
                title="Write Custom Answer"
                icon={Icon.Pencil}
                target={
                  <CustomAnswerForm
                    request={request}
                    field={field}
                    returnToPending={returnToPending}
                    pendingCount={pendingCount}
                  />
                }
              />
              <Action
                title="Cancel Question"
                icon={Icon.XMarkCircle}
                style={Action.Style.Destructive}
                onAction={async () => {
                  await cancelRequest({
                    request,
                    returnToPending,
                    pendingCount,
                  });
                }}
              />
            </ActionPanel>
          }
        />
        {field.choices.map((choice) => (
          <List.Item
            key={choice.label}
            title={choice.label}
            subtitle={showDetail ? choice.detail : undefined}
            accessories={
              !showDetail && choice.detail
                ? [{ text: choice.detail }]
                : undefined
            }
            detail={
              showDetail ? (
                <List.Item.Detail markdown={detailMarkdown} />
              ) : undefined
            }
            actions={
              <ActionPanel>
                <Action
                  title={`Send Answer to ${providerLabel(request)}`}
                  icon={Icon.CheckCircle}
                  onAction={async () => {
                    await submitRequestAnswers({
                      request,
                      answers: {
                        [field.prompt]: choice.label,
                      },
                      returnToPending,
                      pendingCount,
                    });
                  }}
                />
                <Action.Push
                  title="Write Custom Answer"
                  icon={Icon.Pencil}
                  target={
                    <CustomAnswerForm
                      request={request}
                      field={field}
                      returnToPending={returnToPending}
                      pendingCount={pendingCount}
                    />
                  }
                />
                <Action
                  title="Cancel Question"
                  icon={Icon.XMarkCircle}
                  style={Action.Style.Destructive}
                  onAction={async () => {
                    await cancelRequest({
                      request,
                      returnToPending,
                      pendingCount,
                    });
                  }}
                />
              </ActionPanel>
            }
          />
        ))}
      </List.Section>
    </List>
  );
}

function buildQuestionMarkdown(
  field: ClaudeQuestionRequest["questions"][number],
  request?: ClaudeQuestionRequest,
) {
  const lines = [
    `# ${field.prompt}`,
    "",
    request ? `_${providerLabel(request)}_` : "",
    request ? "" : "",
    "_Select one option from the list._",
    "",
  ];

  if (request) {
    lines.push("## Source", "");
    lines.push(`- ${buildSourceSummary(request)}`);
    if (buildSourceDetail(request)) {
      lines.push(`- ${buildSourceDetail(request)}`);
    }
    lines.push("");
  }

  if (field.header) {
    lines.push(`**${field.header}**`, "");
  }

  if (field.choices.length > 0) {
    lines.push("## Options", "");
    for (const choice of field.choices) {
      lines.push(
        choice.detail
          ? `- **${choice.label}**: ${choice.detail}`
          : `- **${choice.label}**`,
      );
    }
  }

  return lines.join("\n");
}

function CustomAnswerForm({
  request,
  field,
  returnToPending,
  pendingCount,
}: {
  request: ClaudeQuestionRequest;
  field: ClaudeQuestionRequest["questions"][number];
  returnToPending: boolean;
  pendingCount: number;
}) {
  return (
    <Form
      navigationTitle={`Custom ${providerLabel(request)} Answer`}
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Send Custom Answer"
            icon={Icon.CheckCircle}
            onSubmit={async (values: FormValues) => {
              const text = normalizeText(values.custom_answer);
              if (!text) {
                await showHUD("Enter a custom answer first");
                return;
              }

              await submitRequestAnswers({
                request,
                answers: {
                  [field.prompt]: text,
                },
                returnToPending,
                pendingCount,
              });
            }}
          />
          <Action
            title="Cancel Question"
            icon={Icon.XMarkCircle}
            style={Action.Style.Destructive}
            onAction={async () => {
              await cancelRequest({
                request,
                returnToPending,
                pendingCount,
              });
            }}
          />
        </ActionPanel>
      }
    >
      <Form.Description
        title={field.header ?? "Question"}
        text={field.prompt}
      />
      <Form.TextArea
        id="custom_answer"
        title="Custom Answer"
        placeholder={`Type the answer to send back to ${providerLabel(request)}`}
      />
    </Form>
  );
}

function QuestionForm({
  request,
  returnToPending,
  pendingCount,
}: {
  request: ClaudeQuestionRequest;
  returnToPending: boolean;
  pendingCount: number;
}) {
  const fields = useMemo(
    () =>
      request.questions.map((question, index) => ({
        ...question,
        fieldId: `question_${index}`,
      })),
    [request.questions],
  );

  return (
    <Form
      navigationTitle={buildNavigationTitle(request)}
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title={`Send Answer to ${providerLabel(request)}`}
            icon={Icon.CheckCircle}
            onSubmit={async (values: FormValues) => {
              const answers = Object.fromEntries(
                fields.map((field) => [
                  field.prompt,
                  resolveAnswerValue(field, values),
                ]),
              );

              const missingPrompt = fields.find((field) =>
                isAnswerEmpty(answers[field.prompt]),
              );
              if (missingPrompt) {
                await showHUD(`Enter an answer for: ${missingPrompt.prompt}`);
                return;
              }

              await submitRequestAnswers({
                request,
                answers,
                returnToPending,
                pendingCount,
              });
            }}
          />
          <Action
            title="Cancel Question"
            icon={Icon.XMarkCircle}
            style={Action.Style.Destructive}
            onAction={async () => {
              await cancelRequest({
                request,
                returnToPending,
                pendingCount,
              });
            }}
          />
        </ActionPanel>
      }
    >
      <Form.Description
        title={`${providerLabel(request)} Needs Answers`}
        text={`${buildRequestSummary(fields)}\n${buildSourceSummary(request)}${
          buildSourceDetail(request) ? `\n${buildSourceDetail(request)}` : ""
        }`}
      />
      {fields.map((field, index) => (
        <QuestionField key={field.fieldId} field={field} index={index} />
      ))}
    </Form>
  );
}

function QuestionField({
  field,
  index,
}: {
  field: ClaudeQuestionRequest["questions"][number] & { fieldId: string };
  index: number;
}) {
  const title = field.header ?? `Question ${index + 1}`;

  return (
    <>
      <Form.Description title={title} text={field.prompt} />
      {field.choices.length > 0 ? (
        field.multiSelect ? (
          <Form.TagPicker id={field.fieldId} title="Options">
            {field.choices.map((choice) => (
              <Form.TagPicker.Item
                key={`${field.fieldId}:${choice.label}`}
                value={choice.label}
                title={choice.detail ? formatChoice(choice) : choice.label}
                icon={choice.detail ? Icon.BulletPoints : undefined}
              />
            ))}
          </Form.TagPicker>
        ) : (
          <Form.Dropdown id={field.fieldId} title="Options">
            {field.choices.map((choice) => (
              <Form.Dropdown.Item
                key={`${field.fieldId}:${choice.label}`}
                value={choice.label}
                title={choice.detail ? formatChoice(choice) : choice.label}
              />
            ))}
          </Form.Dropdown>
        )
      ) : null}
      <Form.TextArea
        id={`${field.fieldId}_custom`}
        title={field.choices.length > 0 ? "Custom Answer" : "Answer"}
        placeholder={
          field.choices.length > 0
            ? "Optional: override the selected option with your own text"
            : (field.placeholder ?? "Type the answer to send back to the agent")
        }
      />
    </>
  );
}

function formatChoice(choice: { label: string; detail?: string }) {
  return `${choice.label} - ${choice.detail}`;
}

function buildRequestSummary(
  fields: Array<
    ClaudeQuestionRequest["questions"][number] & { fieldId: string }
  >,
) {
  const questionCount = fields.length;
  const multiSelectCount = fields.filter((field) => field.multiSelect).length;
  const singleSelectCount = questionCount - multiSelectCount;

  const parts = [`${questionCount} question${questionCount === 1 ? "" : "s"}`];
  if (singleSelectCount > 0) {
    parts.push(`${singleSelectCount} single-select`);
  }
  if (multiSelectCount > 0) {
    parts.push(`${multiSelectCount} multi-select`);
  }

  return parts.join(" · ");
}

function buildSourceSummary(request: ClaudeQuestionRequest) {
  return request.cwd ?? `Current ${providerLabel(request)} session`;
}

function buildSourceTitle(request: ClaudeQuestionRequest) {
  if (request.cwd) {
    return basename(request.cwd) || request.cwd;
  }
  return `Current ${providerLabel(request)} session`;
}

function providerLabel(request: ClaudeQuestionRequest) {
  const source = (request.source ?? "claude").toLowerCase();
  if (source === "gemini") return "Gemini";
  return "Claude";
}

function buildNavigationTitle(request: ClaudeQuestionRequest) {
  return request.title ?? `Answer ${providerLabel(request)} Question`;
}

function buildSourceDetail(request: ClaudeQuestionRequest) {
  const parts: string[] = [];
  if (request.sessionId) {
    parts.push(`session ${request.sessionId.slice(-8)}`);
  }
  if (request.toolUseId) {
    parts.push(`tool ${request.toolUseId.slice(-8)}`);
  }
  return parts.join(" · ");
}

function resolveAnswerValue(
  field: ClaudeQuestionRequest["questions"][number] & { fieldId: string },
  values: FormValues,
) {
  const customText = normalizeText(values[`${field.fieldId}_custom`]);
  if (customText) {
    return customText;
  }

  const rawValue = values[field.fieldId];
  if (field.multiSelect) {
    return Array.isArray(rawValue) ? rawValue : [];
  }

  return typeof rawValue === "string" ? rawValue : "";
}

function normalizeText(value: string | string[] | undefined) {
  if (typeof value !== "string") {
    return "";
  }

  return value.trim();
}

function isAnswerEmpty(value: string | string[]) {
  return (
    (typeof value === "string" && value.length === 0) ||
    (Array.isArray(value) && value.length === 0)
  );
}

async function finish(
  returnUrl: string | null | undefined,
  hud: string,
  returnToPending: boolean,
  pendingCount: number,
) {
  if (returnToPending) {
    if (pendingCount > 1) {
      await open(
        "raycast://extensions/lee_fulln/claude-raycast-notifier/pending-claude-questions",
      );
    } else {
      await showHUD(hud);
      await closeMainWindow();
    }
  } else {
    await showHUD(hud);
    await closeMainWindow();
  }

  if (returnUrl) {
    try {
      await open(returnUrl);
    } catch {
      // Ignore launch failures and leave the response on disk for the hook.
    }
  }
}
