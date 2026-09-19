import { useCallback, useEffect, useMemo, useState } from "react";

import {
  Action,
  ActionPanel,
  Alert,
  confirmAlert,
  Form,
  Icon,
  List,
  showToast,
  Toast,
  useNavigation,
} from "@raycast/api";

import { ErrorView } from "./components/error-view";
import { useRimeInstallation } from "./hooks/use-rime-installation";
import { reloadAfterChange } from "./lib/actions";
import { createPinRule, readPinRules, savePinRules } from "./lib/candidates";
import { getPreferences } from "./lib/preferences";
import { currentSchema } from "./lib/rime";
import { splitCandidates } from "./lib/text";
import type { PinRule, RimeInstallation } from "./types";

type PinFormValues = { schemaId: string; code: string; candidates: string };

function PinCandidateForm({
  installation,
  rule,
  onSaved,
}: {
  installation: RimeInstallation;
  rule?: PinRule;
  onSaved: () => Promise<void>;
}) {
  const { pop } = useNavigation();
  const selectedSchema = currentSchema(installation);

  async function submit(values: PinFormValues) {
    const schema = installation.schemas.find((item) => item.id === values.schemaId);
    if (!schema) return;
    try {
      const allRules = await readPinRules(installation);
      const schemaRules = allRules.filter((item) => item.schemaId === schema.id && item.id !== rule?.id);
      const nextRule = createPinRule(schema, values.code, splitCandidates(values.candidates));
      const duplicateIndex = schemaRules.findIndex((item) => item.code === nextRule.code);
      if (duplicateIndex >= 0) {
        schemaRules[duplicateIndex] = { ...nextRule, id: schemaRules[duplicateIndex].id };
      } else {
        schemaRules.push(nextRule);
      }
      await savePinRules(installation, schema.id, schemaRules);
      if (rule && rule.schemaId !== schema.id) {
        await savePinRules(
          installation,
          rule.schemaId,
          allRules.filter((item) => item.schemaId === rule.schemaId && item.id !== rule.id),
        );
      }
      if (getPreferences().reloadAfterChanges) await reloadAfterChange(installation);
      await onSaved();
      pop();
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Could Not Save Pinned Candidate",
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }

  return (
    <Form
      navigationTitle={rule ? "Edit Pinned Candidates" : "Add Pinned Candidates"}
      actions={
        <ActionPanel>
          <Action.SubmitForm title={rule ? "Save Rule" : "Add Rule"} icon={Icon.Check} onSubmit={submit} />
        </ActionPanel>
      }
    >
      <Form.Dropdown id="schemaId" title="Rime Schema" defaultValue={rule?.schemaId || selectedSchema?.id}>
        {installation.schemas.map((schema) => (
          <Form.Dropdown.Item key={schema.id} value={schema.id} title={`${schema.name} (${schema.id})`} />
        ))}
      </Form.Dropdown>
      <Form.TextField
        id="code"
        title="Input Code"
        placeholder="For example, ni hao or nih"
        defaultValue={rule?.code}
        info="Enter the exact keys used by the selected schema. Spaces are supported when the schema accepts them."
      />
      <Form.TextArea
        id="candidates"
        title="Candidates"
        placeholder="For example, first candidate, second candidate"
        defaultValue={rule?.candidates.join("，")}
        info="Separate multiple candidates with commas. Their order here becomes their pinned order."
      />
      <Form.Description text="This only reorders candidates already produced by the schema. Use custom_phrase.txt for new codes or phrases." />
    </Form>
  );
}

export default function Command() {
  const { data: installation, error, isLoading: isInspecting, revalidate } = useRimeInstallation();
  const [rules, setRules] = useState<PinRule[]>([]);
  const [isLoadingRules, setIsLoadingRules] = useState(true);

  const loadRules = useCallback(async () => {
    if (!installation) return;
    setIsLoadingRules(true);
    try {
      setRules(await readPinRules(installation));
    } finally {
      setIsLoadingRules(false);
    }
  }, [installation]);

  useEffect(() => {
    void loadRules();
  }, [loadRules]);

  const sections = useMemo(() => {
    const grouped = new Map<string, PinRule[]>();
    for (const rule of rules) grouped.set(rule.schemaName, [...(grouped.get(rule.schemaName) ?? []), rule]);
    return [...grouped.entries()];
  }, [rules]);

  if (error) return <ErrorView error={error} onRetry={revalidate} />;

  async function remove(rule: PinRule) {
    if (!installation) return;
    const confirmed = await confirmAlert({
      title: "Remove This Pinned Candidate Rule?",
      message: `Input code: ${rule.code}`,
      primaryAction: { title: "Remove Pin", style: Alert.ActionStyle.Destructive },
    });
    if (!confirmed) return;
    await savePinRules(
      installation,
      rule.schemaId,
      rules.filter((item) => item.schemaId === rule.schemaId && item.id !== rule.id),
    );
    if (getPreferences().reloadAfterChanges) await reloadAfterChange(installation);
    await loadRules();
  }

  const addAction = installation ? (
    <Action.Push
      title="Add Pinned Candidates"
      icon={Icon.Plus}
      target={<PinCandidateForm installation={installation} onSaved={loadRules} />}
    />
  ) : null;

  return (
    <List
      isLoading={isInspecting || isLoadingRules}
      searchBarPlaceholder="Search input codes or candidates…"
      actions={addAction ? <ActionPanel>{addAction}</ActionPanel> : undefined}
    >
      {sections.map(([schemaName, schemaRules]) => (
        <List.Section key={schemaName} title={schemaName}>
          {schemaRules.map((rule) => (
            <List.Item
              key={rule.id}
              title={rule.candidates.join("　")}
              subtitle={rule.code}
              icon={Icon.Pin}
              keywords={[rule.schemaId, ...rule.candidates]}
              accessories={[{ tag: rule.schemaId }]}
              actions={
                <ActionPanel>
                  {installation ? (
                    <>
                      <Action.Push
                        title="Edit Rule"
                        icon={Icon.Pencil}
                        target={<PinCandidateForm installation={installation} rule={rule} onSaved={loadRules} />}
                      />
                      {addAction}
                      <Action
                        title="Remove Pin"
                        icon={Icon.Trash}
                        style={Action.Style.Destructive}
                        onAction={() => remove(rule)}
                      />
                    </>
                  ) : null}
                </ActionPanel>
              }
            />
          ))}
        </List.Section>
      ))}
      {!isInspecting && !isLoadingRules && rules.length === 0 ? (
        <List.EmptyView
          title="No Pinned Candidate Rules"
          description="Existing schema rules are left unchanged. Press Return to add the first managed rule."
          icon={Icon.Pin}
          actions={addAction ? <ActionPanel>{addAction}</ActionPanel> : undefined}
        />
      ) : null}
    </List>
  );
}
