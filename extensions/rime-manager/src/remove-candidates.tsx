import { useCallback, useEffect, useState } from "react";

import {
  Action,
  ActionPanel,
  Alert,
  closeMainWindow,
  confirmAlert,
  Form,
  Icon,
  List,
  PopToRootType,
  showToast,
  Toast,
  useNavigation,
} from "@raycast/api";

import { ErrorView } from "./components/error-view";
import { useRimeInstallation } from "./hooks/use-rime-installation";
import { reloadAfterChange } from "./lib/actions";
import { createLowerRule, readBlockRules, readLowerRules, saveBlockRules, saveLowerRules } from "./lib/candidates";
import { authenticateToRevealRules, consumeRevealGrant } from "./lib/local-authentication";
import { getPreferences } from "./lib/preferences";
import { currentSchema } from "./lib/rime";
import { cleanCandidateText } from "./lib/text";
import type { BlockRule, LowerRule, RimeInstallation } from "./types";

type RuleAction = "block" | "lower";
type CandidateRuleFormValues = { schemaId: string; value: string; code: string };
const REVEAL_DURATION_MS = 60_000;

function CandidateRuleForm({
  installation,
  action,
  onSaved,
}: {
  installation: RimeInstallation;
  action: RuleAction;
  onSaved: () => Promise<void>;
}) {
  const { pop } = useNavigation();
  const selectedSchema = currentSchema(installation);

  async function submit(values: CandidateRuleFormValues) {
    const schema = installation.schemas.find((item) => item.id === values.schemaId);
    if (!schema) return;
    const value = cleanCandidateText(values.value);
    if (!value) {
      await showToast({ style: Toast.Style.Failure, title: "Enter a Candidate" });
      return;
    }

    try {
      if (action === "block") {
        const rules = await readBlockRules(installation);
        if (rules.some((rule) => rule.kind === "exact" && rule.value === value)) {
          throw new Error("An identical blocking rule already exists.");
        }
        rules.push({ id: `block-${Date.now()}`, value, kind: "exact" });
        await saveBlockRules(installation, schema, rules);
      } else {
        const nextRule = createLowerRule(value, values.code);
        const rules = await readLowerRules(installation);
        if (rules.some((rule) => rule.value === nextRule.value && rule.code === nextRule.code)) {
          throw new Error("An identical demotion rule already exists.");
        }
        rules.push(nextRule);
        await saveLowerRules(installation, schema, rules);
      }

      if (getPreferences().reloadAfterChanges) await reloadAfterChange(installation);
      await onSaved();
      pop();
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Could Not Save Candidate Rule",
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }

  return (
    <Form
      navigationTitle={action === "block" ? "Add Blocking Rule" : "Add Demotion Rule"}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Save Rule" icon={Icon.Check} onSubmit={submit} />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="value"
        title="Candidate"
        placeholder={action === "block" ? "Enter the candidate to block" : "Enter the candidate to demote"}
      />
      {action === "lower" ? (
        <>
          <Form.TextField
            id="code"
            title="Input Code"
            placeholder="Enter the exact keys used in this schema"
            info="Enter the letters you type to produce this candidate in the selected schema, not the candidate text."
          />
          <Form.Description text="Demotion never removes the candidate. It moves the candidate to fourth place only when it enters the top three." />
        </>
      ) : (
        <Form.Description text="A blocked candidate will no longer appear in the selected schema." />
      )}
      <Form.Dropdown id="schemaId" title="Rime Schema" defaultValue={selectedSchema?.id}>
        {installation.schemas.map((schema) => (
          <Form.Dropdown.Item key={schema.id} value={schema.id} title={`${schema.name} (${schema.id})`} />
        ))}
      </Form.Dropdown>
      <Form.Description text="After saving, Raycast shows only rule types and counts. Candidate text and input codes remain hidden." />
    </Form>
  );
}

function AddRuleAction({
  installation,
  action,
  onSaved,
}: {
  installation: RimeInstallation;
  action: RuleAction;
  onSaved: () => Promise<void>;
}) {
  return (
    <Action.Push
      title={action === "block" ? "Add Blocking Rule" : "Add Demotion Rule"}
      icon={action === "block" ? Icon.EyeDisabled : Icon.ArrowDown}
      target={<CandidateRuleForm installation={installation} action={action} onSaved={onSaved} />}
    />
  );
}

function PrivateRuleItem({
  title,
  type,
  rule,
  isRevealed,
  onReveal,
  onHide,
  installation,
  onSaved,
  onRemove,
}: {
  title: string;
  type: RuleAction;
  rule: BlockRule | LowerRule;
  isRevealed: boolean;
  onReveal: () => Promise<void>;
  onHide: () => void;
  installation: RimeInstallation;
  onSaved: () => Promise<void>;
  onRemove: () => Promise<void>;
}) {
  return (
    <List.Item
      title={isRevealed ? rule.value : title}
      subtitle={
        isRevealed
          ? type === "lower"
            ? `Input code: ${(rule as LowerRule).code}`
            : "Blocked candidate"
          : "Content hidden"
      }
      icon={type === "block" ? Icon.EyeDisabled : Icon.ArrowDown}
      accessories={[{ tag: type === "block" ? "Blocked" : "Moved to Fourth" }]}
      actions={
        <ActionPanel>
          <Action
            title={isRevealed ? "Hide Candidates" : "Authenticate to Reveal Candidates"}
            icon={isRevealed ? Icon.Lock : Icon.LockUnlocked}
            onAction={isRevealed ? onHide : onReveal}
          />
          <AddRuleAction installation={installation} action="block" onSaved={onSaved} />
          <AddRuleAction installation={installation} action="lower" onSaved={onSaved} />
          <Action title="Delete Rule" icon={Icon.Trash} style={Action.Style.Destructive} onAction={onRemove} />
        </ActionPanel>
      }
    />
  );
}

export default function Command() {
  const { data: installation, error, isLoading: isInspecting, revalidate } = useRimeInstallation();
  const [blockRules, setBlockRules] = useState<BlockRule[]>([]);
  const [lowerRules, setLowerRules] = useState<LowerRule[]>([]);
  const [isLoadingRules, setIsLoadingRules] = useState(true);
  const [isRevealed, setIsRevealed] = useState(false);

  const loadRules = useCallback(async () => {
    if (!installation) return;
    setIsLoadingRules(true);
    try {
      const [nextBlockRules, nextLowerRules] = await Promise.all([
        readBlockRules(installation),
        readLowerRules(installation),
      ]);
      setBlockRules(nextBlockRules);
      setLowerRules(nextLowerRules);
    } finally {
      setIsLoadingRules(false);
    }
  }, [installation]);

  useEffect(() => {
    void loadRules();
  }, [loadRules]);

  useEffect(() => {
    let isActive = true;
    void consumeRevealGrant().then((granted) => {
      if (isActive && granted) setIsRevealed(true);
    });
    return () => {
      isActive = false;
    };
  }, []);

  useEffect(() => {
    if (!isRevealed) return;
    const timeout = setTimeout(() => setIsRevealed(false), REVEAL_DURATION_MS);
    return () => clearTimeout(timeout);
  }, [isRevealed]);

  if (error) return <ErrorView error={error} onRetry={revalidate} />;

  async function confirmRemoval(type: RuleAction): Promise<boolean> {
    return confirmAlert({
      title: type === "block" ? "Delete This Blocking Rule?" : "Delete This Demotion Rule?",
      message: "Candidate text and input codes are not shown here to protect your privacy.",
      primaryAction: { title: "Delete Rule", style: Alert.ActionStyle.Destructive },
    });
  }

  async function revealRules() {
    await showToast({ style: Toast.Style.Animated, title: "Waiting for Authentication" });
    await closeMainWindow({ popToRootType: PopToRootType.Suspended });
    try {
      const authenticated = await authenticateToRevealRules();
      if (!authenticated) {
        await showToast({ style: Toast.Style.Failure, title: "Candidate Reveal Canceled" });
        return;
      }
      setIsRevealed(true);
      await showToast({ style: Toast.Style.Success, title: "Candidates Will Hide Again in 60 Seconds" });
    } catch (authenticationError) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Authentication Failed",
        message: authenticationError instanceof Error ? authenticationError.message : String(authenticationError),
      });
    }
  }

  async function removeBlockRule(rule: BlockRule) {
    if (!installation || !(await confirmRemoval("block"))) return;
    const schema = currentSchema(installation);
    if (!schema) return;
    await saveBlockRules(
      installation,
      schema,
      blockRules.filter((item) => item.id !== rule.id),
    );
    if (getPreferences().reloadAfterChanges) await reloadAfterChange(installation);
    await loadRules();
  }

  async function removeLowerRule(rule: LowerRule) {
    if (!installation || !(await confirmRemoval("lower"))) return;
    const schema = currentSchema(installation);
    if (!schema) return;
    await saveLowerRules(
      installation,
      schema,
      lowerRules.filter((item) => item.id !== rule.id),
    );
    if (getPreferences().reloadAfterChanges) await reloadAfterChange(installation);
    await loadRules();
  }

  const isEmpty = blockRules.length === 0 && lowerRules.length === 0;

  return (
    <List isLoading={isInspecting || isLoadingRules} searchBarPlaceholder="Search candidate rules…">
      {installation ? (
        <List.Section title="Actions">
          <List.Item
            title={isRevealed ? "Hide Candidates" : "Authenticate to Reveal Candidates"}
            subtitle={
              isRevealed
                ? "Visible only in this session and hidden again after 60 seconds"
                : "Use Touch ID, Apple Watch, or your Mac login password"
            }
            icon={isRevealed ? Icon.Lock : Icon.LockUnlocked}
            actions={
              <ActionPanel>
                <Action
                  title={isRevealed ? "Hide Candidates" : "Authenticate to Reveal Candidates"}
                  icon={isRevealed ? Icon.Lock : Icon.LockUnlocked}
                  onAction={isRevealed ? () => setIsRevealed(false) : revealRules}
                />
              </ActionPanel>
            }
          />
          <List.Item
            title="Add Blocking Rule"
            subtitle="Prevent a candidate from appearing"
            icon={Icon.EyeDisabled}
            actions={
              <ActionPanel>
                <AddRuleAction installation={installation} action="block" onSaved={loadRules} />
              </ActionPanel>
            }
          />
          <List.Item
            title="Add Demotion Rule"
            subtitle="Keep a candidate but move it to fourth place when it enters the top three"
            icon={Icon.ArrowDown}
            actions={
              <ActionPanel>
                <AddRuleAction installation={installation} action="lower" onSaved={loadRules} />
              </ActionPanel>
            }
          />
        </List.Section>
      ) : null}
      <List.Section title="Blocking Rules" subtitle={`${blockRules.length}`}>
        {blockRules.map((rule, index) => (
          <PrivateRuleItem
            key={rule.id}
            title={`Blocking Rule ${index + 1}`}
            type="block"
            rule={rule}
            isRevealed={isRevealed}
            onReveal={revealRules}
            onHide={() => setIsRevealed(false)}
            installation={installation!}
            onSaved={loadRules}
            onRemove={() => removeBlockRule(rule)}
          />
        ))}
      </List.Section>
      <List.Section title="Demotion Rules" subtitle={`${lowerRules.length}`}>
        {lowerRules.map((rule, index) => (
          <PrivateRuleItem
            key={rule.id}
            title={`Demotion Rule ${index + 1}`}
            type="lower"
            rule={rule}
            isRevealed={isRevealed}
            onReveal={revealRules}
            onHide={() => setIsRevealed(false)}
            installation={installation!}
            onSaved={loadRules}
            onRemove={() => removeLowerRule(rule)}
          />
        ))}
      </List.Section>
      {!isInspecting && !isLoadingRules && isEmpty ? (
        <List.EmptyView
          title="No Candidate Rules"
          description="Add a rule to block a candidate or keep it outside the top three."
          icon={Icon.Shield}
          actions={
            installation ? (
              <ActionPanel>
                <AddRuleAction installation={installation} action="block" onSaved={loadRules} />
                <AddRuleAction installation={installation} action="lower" onSaved={loadRules} />
              </ActionPanel>
            ) : undefined
          }
        />
      ) : null}
    </List>
  );
}
