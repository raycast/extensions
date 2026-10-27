import { Action, ActionPanel, Form, Icon, showHUD } from "@raycast/api";
import { useEffect, useRef, useState } from "react";
import * as api from "../lib/api";
import { normalizePattern } from "../lib/host";
import { reportFailure } from "../lib/toast";
import type { Target } from "../lib/types";

type Values = { pattern: string; enabled: boolean };

/**
 * The one place a target is created or edited, shared by the dashboard (pushed)
 * and the `add-target` command (root). The caller owns navigation, so the same
 * form can end in "back to the list" or "close the window".
 */
export function TargetForm({
  target,
  initialPattern,
  prefill,
  onSaved,
}: {
  target?: Target;
  initialPattern?: string;
  /** Filled in after mount, once the active tab has been read. Never overwrites typing. */
  prefill?: string;
  onSaved?: (kind: "added" | "updated", pattern: string) => void | Promise<void>;
}) {
  const initial = target?.pattern ?? initialPattern ?? "";
  const [pattern, setPattern] = useState(initial);
  const [enabled, setEnabled] = useState(target?.enabled ?? true);
  const [error, setError] = useState<string | undefined>(undefined);
  const [busy, setBusy] = useState(false);

  const editing = target !== undefined;
  const prefilled = useRef(false);

  // Raycast's TextField fires onChange once on mount, so "did the user type?" is
  // measured against the initial value, not against a change counter.
  useEffect(() => {
    if (!prefill || editing || prefilled.current) return;
    if (pattern !== initial) return;
    prefilled.current = true;
    setPattern(prefill);
  }, [prefill, editing, pattern, initial]);

  async function submit(values: Values, keepOpen: boolean) {
    if (busy) return;

    const normalized = normalizePattern(values.pattern);
    if (!normalized.ok) {
      setError(normalized.error);
      return;
    }

    setError(undefined);
    setBusy(true);
    try {
      if (target) {
        await api.updateTarget(target.id, { pattern: normalized.pattern, enabled: values.enabled });
      } else {
        const result = await api.addTarget(normalized.pattern, values.enabled);
        if (result.pattern !== normalized.pattern) {
          // The app canonicalises further; show what it actually stored.
          await showHUD(`Added ${result.pattern}`);
        }
      }

      await showHUD(
        target
          ? `Saved ${normalized.pattern}`
          : `${values.enabled ? "Routing" : "Saved"} ${normalized.pattern}`,
      );

      if (keepOpen) {
        setPattern("");
      } else {
        await onSaved?.(target ? "updated" : "added", normalized.pattern);
      }
    } catch (submitError) {
      await reportFailure(
        submitError,
        editing ? "Couldn't update the target" : "Couldn't add the target",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <Form
      navigationTitle={editing ? `Edit ${target?.pattern}` : "Add Target"}
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            <Action.SubmitForm<Values>
              title={editing ? "Save Target" : "Add Target"}
              icon={Icon.CheckCircle}
              onSubmit={(values) => submit(values, false)}
            />
            {!editing ? (
              <Action.SubmitForm<Values>
                title="Add and Add Another"
                icon={Icon.Plus}
                shortcut={{ modifiers: ["cmd", "shift"], key: "enter" }}
                onSubmit={(values) => submit(values, true)}
              />
            ) : null}
          </ActionPanel.Section>
        </ActionPanel>
      }
    >
      <Form.TextField
        id="pattern"
        title="Host"
        placeholder="api.example.com or *.example.com"
        value={pattern}
        error={error}
        onChange={(value) => {
          setPattern(value);
          if (error) setError(undefined);
        }}
      />
      <Form.Checkbox
        id="enabled"
        title="Routing"
        label="Route this host through the tunnel"
        value={enabled}
        onChange={setEnabled}
      />
      <Form.Description text="Only the host is stored — scheme, port and path are dropped. Use *.example.com to cover every subdomain." />
    </Form>
  );
}
