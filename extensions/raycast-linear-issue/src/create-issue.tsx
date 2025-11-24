import React from "react";
import {
  ActionPanel,
  Action,
  Form,
  showToast,
  Toast,
  getPreferenceValues,
  AI,
} from "@raycast/api";
import fetch from "node-fetch";
import JSON5 from "json5";

const LINEAR_GRAPHQL_ENDPOINT = "https://api.linear.app/graphql";
const OPENAI_CHAT_COMPLETIONS_ENDPOINT =
  "https://api.openai.com/v1/chat/completions";

type Prefs = {
  linearApiKey: string;
  useRaycastAI: boolean;
  openaiKey?: string;
};

type AIParsedIssue = {
  title: string | null;
  description: string | null;
  owner: string | null;
  team: string | null;
  cycle: string | null;
  project: string | null;
};

type FormValues = {
  selectedText?: string;
  userInput?: string;
};

type GraphQLResponse<T> = {
  data?: T;
  errors?: { message?: string }[];
};

type IssueCreatePayload = {
  issueCreate?: {
    issue?: {
      url: string;
    };
  };
};

type IssueCreateInput = {
  title: string;
  description: string;
  teamId: string;
  projectId?: string;
  cycleId?: string;
};

export default function Command() {
  const prefs = getPreferenceValues<Prefs>();

  async function handleSubmit(values: FormValues) {
    const selectedText = values.selectedText?.trim() ?? "";
    const userInput = values.userInput?.trim() ?? "";

    if (!selectedText && !userInput) {
      await showToast(
        Toast.Style.Failure,
        "Content required",
        "Add selected text or extra context so AI has material to work with.",
      );
      return;
    }

    if (!prefs.useRaycastAI && !prefs.openaiKey) {
      await showToast(
        Toast.Style.Failure,
        "Missing OpenAI key",
        "Provide an OpenAI API key or enable Raycast AI in preferences.",
      );
      return;
    }

    try {
      const toast = await showToast(Toast.Style.Animated, "Analyzing with AI…");

      const aiResult = await callAI(userInput, selectedText, prefs);

      toast.message = "Creating issue…";

      const issueUrl = await createLinearIssue(aiResult, prefs.linearApiKey);

      toast.style = Toast.Style.Success;
      toast.title = "Issue created";
      toast.message = issueUrl;
    } catch (error) {
      console.error(error);
      const message =
        error instanceof Error ? error.message : "Unknown error occurred";
      await showToast(Toast.Style.Failure, "Failed to create issue", message);
    }
  }

  return (
    <Form
      navigationTitle="Create Linear Issue (AI)"
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Create Issue" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.Description text="Share the raw signal (selected text) plus optional context so AI can draft a clear Linear issue." />
      <Form.TextArea
        id="selectedText"
        title="Selected Text"
        placeholder="Paste highlighted text or describe the bug/idea in your own words."
        enableMarkdown
      />
      <Form.TextArea
        id="userInput"
        title="Additional Context"
        placeholder="Optional: owner, team, desired outcome, blockers…"
        enableMarkdown
      />
    </Form>
  );
}

// Ask Raycast AI or OpenAI to transform free-form text into a structured issue.
async function callAI(
  userInput: string,
  selectedText: string,
  prefs: Prefs,
): Promise<AIParsedIssue> {
  const prompt = `
You are an assistant that extracts Linear issue details.
You will receive:
1. Selected text (may become part of the description)
2. User-provided context (any format)

Return ONLY strict JSON with this shape:
{
  "title": "",
  "description": "",
  "owner": "",
  "team": "",
  "cycle": "",
  "project": ""
}

Rules:
- Respond with raw JSON, no explanation.
- Use null for unknown fields.
- Description must blend selected text + user context.
- Keep the title concise and professional.
`;

  const input = `
=== Selected Text ===
${selectedText}

=== Additional Context ===
${userInput}

Return JSON only:
`;

  let raw = "";

  if (prefs.useRaycastAI) {
    raw = await AI.ask(prompt + input, {
      creativity: 0.3,
    });
  } else {
    const resp = await fetch(OPENAI_CHAT_COMPLETIONS_ENDPOINT, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${prefs.openaiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4.1-mini",
        messages: [{ role: "user", content: prompt + input }],
        temperature: 0.2,
      }),
    });

    if (!resp.ok) {
      throw new Error(`OpenAI request failed (${resp.status})`);
    }

    const json = (await resp.json()) as {
      choices?: { message?: { content?: string } }[];
    };
    raw = json.choices?.[0]?.message?.content ?? "";
  }

  try {
    let cleanedRaw = raw.trim();
    const codeBlockMatch = cleanedRaw.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
    if (codeBlockMatch) {
      cleanedRaw = codeBlockMatch[1];
    }

    const parsed = JSON5.parse(cleanedRaw) as Partial<AIParsedIssue>;
    return normalizeAIResult(parsed);
  } catch (err) {
    console.error("JSON parse failed:", raw);
    throw new Error(
      "AI returned content that was not valid JSON. Try rephrasing your input.",
    );
  }
}

// Guard against missing fields and always return the expected object shape.
function normalizeAIResult(data: Partial<AIParsedIssue>): AIParsedIssue {
  return {
    title: sanitizeStringField(data?.title),
    description: sanitizeStringField(data?.description),
    owner: sanitizeStringField(data?.owner),
    team: sanitizeStringField(data?.team),
    cycle: sanitizeStringField(data?.cycle),
    project: sanitizeStringField(data?.project),
  };
}

function sanitizeStringField(value: string | null | undefined) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

// Create a Linear issue and map AI result to concrete IDs.
async function createLinearIssue(data: AIParsedIssue, linearKey: string) {
  const query = `
    mutation IssueCreate($input: IssueCreateInput!) {
      issueCreate(input: $input) {
        issue {
          id
          title
          url
        }
      }
    }
  `;

  const [teamId, projectId, cycleId] = await Promise.all([
    resolveTeamId(data.team, linearKey),
    resolveProjectId(data.project, linearKey),
    resolveCycleId(data.cycle, linearKey),
  ]);

  if (!teamId) {
    throw new Error(
      "Unable to resolve a Linear team. Mention the team name explicitly in Additional Context.",
    );
  }

  const input: IssueCreateInput = {
    title: data.title ?? "AI generated issue",
    description: data.description ?? "",
    teamId,
  };

  if (projectId) {
    input.projectId = projectId;
  }

  if (cycleId) {
    input.cycleId = cycleId;
  }

  const json = await linearGraphQLRequest<IssueCreatePayload>(
    linearKey,
    query,
    { input },
  );

  const url = json.issueCreate?.issue?.url;
  if (!url) {
    throw new Error("Linear returned an unexpected response");
  }

  return url;
}

async function resolveTeamId(name: string | null, apiKey: string) {
  if (!name) return null;
  return findEntityId("teams", name, apiKey);
}

async function resolveProjectId(name: string | null, apiKey: string) {
  if (!name) return null;
  return findEntityId("projects", name, apiKey);
}

async function resolveCycleId(name: string | null, apiKey: string) {
  if (!name) return null;
  return findEntityId("cycles", name, apiKey);
}

async function findEntityId(entity: string, name: string, apiKey: string) {
  const query = `
    query {
      ${entity} {
        nodes {
          id
          name
        }
      }
    }
  `;

  const json = await linearGraphQLRequest<
    Record<string, { nodes?: { id: string; name: string }[] }>
  >(apiKey, query);

  const list = json?.[entity]?.nodes ?? [];
  const match = list.find(
    (item) => item.name.toLowerCase() === name.toLowerCase(),
  );
  return match?.id ?? null;
}

async function linearGraphQLRequest<TData>(
  apiKey: string,
  query: string,
  variables?: Record<string, unknown>,
) {
  const resp = await fetch(LINEAR_GRAPHQL_ENDPOINT, {
    method: "POST",
    headers: {
      Authorization: apiKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ query, variables }),
  });

  if (!resp.ok) {
    throw new Error(`Linear request failed (${resp.status})`);
  }

  const json = (await resp.json()) as GraphQLResponse<TData>;

  if (json.errors?.length) {
    throw new Error(json.errors.map((err) => err.message).join("; "));
  }

  if (!json.data) {
    throw new Error("Linear response did not include data");
  }

  return json.data;
}
