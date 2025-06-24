import { ActionPanel, Action, Form, showToast, Toast, getPreferenceValues, open } from "@raycast/api";
import { useState } from "react";
import OpenAI from "openai";
import axios from "axios";

interface Preferences {
  openaiApiKey: string;
  jiraEmail: string;
  jiraApiToken: string;
  jiraBaseUrl: string;
  defaultTeam: string;
  defaultInitiative: string;
}

export default function Command() {
  const [input, setInput] = useState("");
  const preferences = getPreferenceValues<Preferences>();
  const [selectedInitiative, setSelectedInitiative] = useState(preferences.defaultInitiative || "QR-1106");

  // Initiative options (top 15 most recent/relevant)
  const initiativeOptions = [
    { title: "[25Q2] Q2 MBNXT - Performance & Stability", value: "QR-1106" },
    { title: "[25Q2] MBNXT checkout Ireland", value: "QR-1161" },
    { title: "[25Q2] Integrate Suggest PoC in Mbnxt", value: "QR-1160" },
    { title: "[25Q2] MBNXT checkout in Ireland - discovery", value: "QR-1139" },
    { title: "[2025-Q2] MBNXT Mobile Test Automation", value: "QR-1128" },
    { title: "[25Q2] KTLO - MBNXT web", value: "QR-1080" },
    { title: "[25Q2] MBNXT web Post-purchase Q2 KTLO", value: "QR-1078" },
    { title: "[25Q2] MBNXT ramp-up support", value: "QR-1055" },
    { title: "[25Q2] [MBNXT] Mobile app - BAU", value: "QR-1046" },
    { title: "MBNXT pre-purchase - BAU", value: "QR-1032" },
    { title: "[25Q2] MBNXT pre-purchase - KTLO", value: "QR-1031" },
    { title: "[25Q1] bulkbpod optimization (mbnxt)", value: "QR-1015" },
    { title: "[25Q1] MBNXT INTL rollout plan", value: "QR-877" },
    { title: "[25Q1] MBNXT ramp-up support", value: "QR-869" },
    { title: "[25Q1] Travel - MBNXT INTL support", value: "QR-862" },
  ];

  async function handleSubmit() {
    try {
      await showToast({ style: Toast.Style.Animated, title: "Sending to GPT-4o-mini..." });

      const openai = new OpenAI({ apiKey: preferences.openaiApiKey });
      const prompt = `Convert this into a Jira issue JSON for MBNXT project with these fields and options:

REQUIRED FIELDS:
- projectKey: Default "MBNXT" UNLESS the user mentions "under project X", "for project X", "in project X", or similar - then use that project key (e.g., "MESH", "QR", "DEAL", etc.)
- summary: Concise, action-oriented title (e.g., "Make macaroon cookie HttpOnly", "Fix login timeout issue", "Add search filters"). Keep it short and clear, no need for issue type prefix.
- issueType: Always use "Story" unless the user explicitly mentions "bug", "task", "epic", "improvement", "spike", or "new feature" in their input
- description: Full structured description with acceptance criteria, background, etc.
- priority: Choose from ["Blocker", "Critical", "High", "Medium", "Low"] (default: "Medium")
- components: Array of component names, choose from ["Platform & Infrastructure", "Advertisement", "Booking", "Browse (category) page & Landing pages", "Cart & Checkout", "Deal page", "Gifting", "Homepage", "Login & Signup", "Mobile app", "My account & My preferences", "My Groupons & Vouchers details", "Page speed & Performance", "Receipt", "Search & Autocomplete", "SEO", "Travel"] (default: ["Platform & Infrastructure"])
- labels: Array of labels (default: ["feature"])

User input: "${input}"

IMPORTANT: Return ONLY the raw JSON object without any markdown formatting, code blocks, or additional text. Start directly with { and end with }.`;

      const chat = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [{ role: "user", content: prompt }],
      });

      let responseContent = chat.choices[0].message.content || "{}";

      // Clean markdown code blocks if present
      responseContent = responseContent
        .replace(/^```json\s*/, "")
        .replace(/\s*```$/, "")
        .trim();

      const issue = JSON.parse(responseContent);

      await showToast({ style: Toast.Style.Animated, title: "Creating Jira ticket..." });

      const projectKey = issue.projectKey || "MBNXT";

      // Base payload fields that work for all projects
      const jiraPayload: { fields: Record<string, unknown> } = {
        fields: {
          project: { key: projectKey },
          summary: issue.summary,
          issuetype: { name: issue.issueType || "Story" },
          description: {
            type: "doc",
            version: 1,
            content: [
              {
                type: "paragraph",
                content: [
                  {
                    type: "text",
                    text: issue.description || issue.summary,
                  },
                ],
              },
            ],
          },
          priority: { name: issue.priority || "Medium" },
          labels: issue.labels || ["feature"],
        },
      };

      // Add MBNXT-specific fields only if project is MBNXT
      if (projectKey === "MBNXT") {
        jiraPayload.fields.components = issue.components
          ? issue.components.map((comp: string) => ({ name: comp }))
          : [{ name: "Platform & Infrastructure" }];
        jiraPayload.fields.customfield_19118 = preferences.defaultTeam; // Team field

        // Set parent based on issue type hierarchy
        if (issue.issueType === "Epic") {
          // Epics can be parented to Initiatives
          jiraPayload.fields.parent = { key: selectedInitiative };
        } else {
          // Stories, Tasks, Bugs should be parented to Epics (use MBNXT-19537 as default Epic)
          jiraPayload.fields.parent = { key: "MBNXT-19537" };
        }
      }

      const response = await axios.post(`${preferences.jiraBaseUrl}/rest/api/3/issue`, jiraPayload, {
        auth: {
          username: preferences.jiraEmail,
          password: preferences.jiraApiToken,
        },
        headers: { "Content-Type": "application/json" },
      });

      await showToast({
        style: Toast.Style.Success,
        title: "Ticket created!",
        message: `${response.data.key} (${projectKey}) - ${issue.summary}`,
        primaryAction: {
          title: response.data.key,
          onAction: () => open(`${preferences.jiraBaseUrl}/browse/${response.data.key}`),
        },
      });
    } catch (error) {
      console.error("Jira creation error:", error);
      let errorMessage = "Unknown error";

      if (axios.isAxiosError(error) && error.response) {
        errorMessage = `${error.response.status}: ${JSON.stringify(error.response.data)}`;
      } else if (error instanceof Error) {
        errorMessage = error.message;
      }

      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to create ticket",
        message: errorMessage,
      });
    }
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Create Ticket" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.Dropdown
        id="initiative"
        title="Initiative (Parent)"
        placeholder="Select an initiative"
        value={selectedInitiative}
        onChange={setSelectedInitiative}
      >
        {initiativeOptions.map((option) => (
          <Form.Dropdown.Item key={option.value} value={option.value} title={option.title} />
        ))}
      </Form.Dropdown>
      <Form.TextArea
        id="input"
        title="Describe the ticket"
        placeholder="E.g. Make macaroon cookie HttpOnly..."
        value={input}
        onChange={setInput}
      />
    </Form>
  );
}
