import { AI, Action, ActionPanel, Form, Icon, Toast, environment, showToast } from "@raycast/api";
import { useState } from "react";
import { getBrowserIcon, getBrowserTitle } from "../lib/browsers";
import { CreateRuleInput, createRule } from "../lib/rules";
import { VeljaMatcherKind } from "../lib/types";
import { readVeljaConfig } from "../lib/velja";

type FormValues = {
  aiPrompt: string;
  title: string;
  browser: string;
  matcherKind: VeljaMatcherKind;
  matcherPattern: string;
  matcherFixture: string;
  sourceApps: string;
  forceNewWindow: boolean;
  openInBackground: boolean;
  onlyFromAirdrop: boolean;
  runAfterBuiltinRules: boolean;
  isTransformScriptEnabled: boolean;
  transformScript: string;
};

type RuleDraftPayload = Partial<{
  title: string;
  browser: string;
  matcherKind: VeljaMatcherKind;
  matcherPattern: string;
  matcherFixture: string;
  sourceApps: string[];
  forceNewWindow: boolean;
  openInBackground: boolean;
  onlyFromAirdrop: boolean;
  runAfterBuiltinRules: boolean;
  isTransformScriptEnabled: boolean;
  transformScript: string;
}>;

function isMatcherKind(value: unknown): value is VeljaMatcherKind {
  return value === "host" || value === "hostSuffix" || value === "urlPrefix";
}

function parseJsonObject(text: string): Record<string, unknown> {
  const trimmed = text.trim();
  if (!trimmed) {
    throw new Error("AI response was empty.");
  }

  const fencedBlock = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const primaryCandidate = fencedBlock ? fencedBlock[1].trim() : trimmed;

  try {
    const parsed = JSON.parse(primaryCandidate) as unknown;
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      return parsed as Record<string, unknown>;
    }
  } catch {
    // Fallback parsing below.
  }

  const objectMatch = primaryCandidate.match(/\{[\s\S]*\}/);
  if (!objectMatch) {
    throw new Error("AI response did not contain a JSON object.");
  }

  const parsed = JSON.parse(objectMatch[0]) as unknown;
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error("AI response JSON must be an object.");
  }

  return parsed as Record<string, unknown>;
}

function buildRuleDraftPrompt(userIntent: string, browserOptions: string[]): string {
  return [
    "You generate Velja rule drafts.",
    "Return ONLY a JSON object with these keys:",
    "title, browser, matcherKind, matcherPattern, matcherFixture, sourceApps, forceNewWindow, openInBackground, onlyFromAirdrop, runAfterBuiltinRules, isTransformScriptEnabled, transformScript",
    'matcherKind must be one of: "host", "hostSuffix", "urlPrefix".',
    "sourceApps must be an array of bundle ID strings.",
    "Use booleans for all option flags.",
    "Choose browser using an exact identifier from this list:",
    ...browserOptions.map((identifier) => `- ${identifier}`),
    "",
    `User intent: ${userIntent}`,
  ].join("\n");
}

export default function Command() {
  const config = readVeljaConfig();
  const browserOptions = config.preferredBrowsers;
  const canUseAi = environment.canAccess(AI);
  const [formValues, setFormValues] = useState<FormValues>({
    aiPrompt: "",
    title: "",
    browser: browserOptions[0],
    matcherKind: "hostSuffix",
    matcherPattern: "",
    matcherFixture: "",
    sourceApps: "",
    forceNewWindow: false,
    openInBackground: false,
    onlyFromAirdrop: false,
    runAfterBuiltinRules: false,
    isTransformScriptEnabled: false,
    transformScript: "",
  });
  const [isDrafting, setIsDrafting] = useState(false);

  if (browserOptions.length === 0) {
    return (
      <Form>
        <Form.Description text="No browsers found in Velja preferences. Configure browsers in Velja first." />
      </Form>
    );
  }

  function updateFormValue<Key extends keyof FormValues>(key: Key, value: FormValues[Key]) {
    setFormValues((current) => ({
      ...current,
      [key]: value,
    }));
  }

  async function handleDraftWithAi() {
    if (isDrafting) {
      return;
    }

    if (!canUseAi) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Raycast AI isn't available",
        message: "Use manual fields or enable Raycast AI for this account.",
      });
      return;
    }

    const userIntent = formValues.aiPrompt.trim();
    if (!userIntent) {
      await showToast({ style: Toast.Style.Failure, title: "Add an AI Draft Prompt first" });
      return;
    }

    setIsDrafting(true);
    await showToast({ style: Toast.Style.Animated, title: "Generating rule draft..." });

    try {
      const response = await AI.ask(buildRuleDraftPrompt(userIntent, browserOptions), {
        creativity: "low",
      });

      const payload = parseJsonObject(response) as RuleDraftPayload;

      setFormValues((current) => ({
        ...current,
        title: typeof payload.title === "string" && payload.title.trim() ? payload.title.trim() : current.title,
        browser:
          typeof payload.browser === "string" && browserOptions.includes(payload.browser)
            ? payload.browser
            : current.browser,
        matcherKind: isMatcherKind(payload.matcherKind) ? payload.matcherKind : current.matcherKind,
        matcherPattern:
          typeof payload.matcherPattern === "string" ? payload.matcherPattern.trim() : current.matcherPattern,
        matcherFixture:
          typeof payload.matcherFixture === "string" ? payload.matcherFixture.trim() : current.matcherFixture,
        sourceApps: Array.isArray(payload.sourceApps)
          ? payload.sourceApps
              .filter((value): value is string => typeof value === "string" && value.trim().length > 0)
              .join(", ")
          : current.sourceApps,
        forceNewWindow: typeof payload.forceNewWindow === "boolean" ? payload.forceNewWindow : current.forceNewWindow,
        openInBackground:
          typeof payload.openInBackground === "boolean" ? payload.openInBackground : current.openInBackground,
        onlyFromAirdrop:
          typeof payload.onlyFromAirdrop === "boolean" ? payload.onlyFromAirdrop : current.onlyFromAirdrop,
        runAfterBuiltinRules:
          typeof payload.runAfterBuiltinRules === "boolean"
            ? payload.runAfterBuiltinRules
            : current.runAfterBuiltinRules,
        isTransformScriptEnabled:
          typeof payload.isTransformScriptEnabled === "boolean"
            ? payload.isTransformScriptEnabled
            : current.isTransformScriptEnabled,
        transformScript:
          typeof payload.transformScript === "string" ? payload.transformScript.trim() : current.transformScript,
      }));

      await showToast({ style: Toast.Style.Success, title: "Rule draft generated. Review before creating." });
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Could not draft rule",
        message: error instanceof Error ? error.message : String(error),
      });
    } finally {
      setIsDrafting(false);
    }
  }

  async function handleSubmit(values: FormValues) {
    await showToast({ style: Toast.Style.Animated, title: "Creating rule..." });

    try {
      if (!values.title.trim()) {
        throw new Error("Rule title is required");
      }

      if (!values.browser) {
        throw new Error("Please select a browser");
      }

      const input: CreateRuleInput = {
        title: values.title,
        browser: values.browser,
        matcherKind: values.matcherKind,
        matcherPattern: values.matcherPattern,
        matcherFixture: values.matcherFixture,
        sourceApps: values.sourceApps
          .split(",")
          .map((sourceApp) => sourceApp.trim())
          .filter(Boolean),
        forceNewWindow: values.forceNewWindow,
        openInBackground: values.openInBackground,
        onlyFromAirdrop: values.onlyFromAirdrop,
        runAfterBuiltinRules: values.runAfterBuiltinRules,
        isTransformScriptEnabled: values.isTransformScriptEnabled,
        transformScript: values.transformScript,
      };

      const created = createRule(input);
      await showToast({ style: Toast.Style.Success, title: `Created "${created.title}"` });
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Could not create rule",
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }

  return (
    <Form
      actions={
        <ActionPanel>
          {canUseAi ? (
            isDrafting ? (
              <Action title="Generating Rule Draft…" icon={Icon.Stars} onAction={handleDraftWithAi} />
            ) : (
              <Action title="Generate Rule Draft" icon={Icon.Stars} onAction={handleDraftWithAi} />
            )
          ) : (
            <Action title="Generate Rule Draft Locked" icon={Icon.Stars} onAction={handleDraftWithAi} />
          )}
          <Action.SubmitForm
            title="Create Rule"
            onSubmit={handleSubmit}
            shortcut={{ modifiers: ["cmd"], key: "enter" }}
          />
        </ActionPanel>
      }
    >
      <Form.Description
        text={
          canUseAi
            ? "AI is available. Use “Draft Rule With AI” from Actions to populate fields from your prompt."
            : "AI drafting is currently unavailable for this Raycast account. You can still create rules manually."
        }
      />
      <Form.TextArea
        id="aiPrompt"
        title="AI Draft Prompt"
        placeholder="Describe the rule you want, including URL pattern, browser/profile, and source app."
        value={formValues.aiPrompt}
        onChange={(value) => updateFormValue("aiPrompt", value)}
      />
      <Form.Separator />
      <Form.TextField
        id="title"
        title="Rule Title"
        placeholder="My Velja Rule"
        value={formValues.title}
        onChange={(value) => updateFormValue("title", value)}
      />
      <Form.Dropdown
        id="browser"
        title="Open In Browser"
        value={formValues.browser}
        onChange={(value) => updateFormValue("browser", value)}
      >
        {browserOptions.map((identifier) => (
          <Form.Dropdown.Item
            key={identifier}
            value={identifier}
            title={getBrowserTitle(identifier)}
            icon={getBrowserIcon(identifier)}
          />
        ))}
      </Form.Dropdown>

      <Form.Separator />
      <Form.Description text="Matcher (optional, leave pattern blank to create a source-app only rule)." />
      <Form.Dropdown
        id="matcherKind"
        title="Matcher Kind"
        value={formValues.matcherKind}
        onChange={(value) => updateFormValue("matcherKind", value as VeljaMatcherKind)}
      >
        <Form.Dropdown.Item value="host" title="Host (exact)" />
        <Form.Dropdown.Item value="hostSuffix" title="Host Suffix (ends with)" />
        <Form.Dropdown.Item value="urlPrefix" title="URL Prefix (starts with)" />
      </Form.Dropdown>
      <Form.TextField
        id="matcherPattern"
        title="Matcher Pattern"
        placeholder="example.com"
        value={formValues.matcherPattern}
        onChange={(value) => updateFormValue("matcherPattern", value)}
      />
      <Form.TextField
        id="matcherFixture"
        title="Sample URL"
        placeholder="https://example.com/path"
        value={formValues.matcherFixture}
        onChange={(value) => updateFormValue("matcherFixture", value)}
      />

      <Form.Separator />
      <Form.TextField
        id="sourceApps"
        title="Source Apps (comma-separated bundle IDs)"
        placeholder="com.tinyspeck.slackmacgap, com.microsoft.VSCode"
        value={formValues.sourceApps}
        onChange={(value) => updateFormValue("sourceApps", value)}
      />
      <Form.Checkbox
        id="forceNewWindow"
        label="Force New Window"
        value={formValues.forceNewWindow}
        onChange={(value) => updateFormValue("forceNewWindow", value)}
      />
      <Form.Checkbox
        id="openInBackground"
        label="Open in Background"
        value={formValues.openInBackground}
        onChange={(value) => updateFormValue("openInBackground", value)}
      />
      <Form.Checkbox
        id="onlyFromAirdrop"
        label="Only from AirDrop"
        value={formValues.onlyFromAirdrop}
        onChange={(value) => updateFormValue("onlyFromAirdrop", value)}
      />
      <Form.Checkbox
        id="runAfterBuiltinRules"
        label="Run After Built-in Rules"
        value={formValues.runAfterBuiltinRules}
        onChange={(value) => updateFormValue("runAfterBuiltinRules", value)}
      />
      <Form.Checkbox
        id="isTransformScriptEnabled"
        label="Enable Transform Script"
        value={formValues.isTransformScriptEnabled}
        onChange={(value) => updateFormValue("isTransformScriptEnabled", value)}
      />
      <Form.TextArea
        id="transformScript"
        title="Transform Script"
        placeholder="$.url = new URL($.url.href);"
        value={formValues.transformScript}
        onChange={(value) => updateFormValue("transformScript", value)}
      />
    </Form>
  );
}
