import { Action, ActionPanel, Alert, confirmAlert, Form, Icon, showToast, Toast, useNavigation } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { useRef, useState } from "react";
import { addSkipRule, countPatternMatches, deletePatternMatches } from "./api";
import { pagePattern, sitePattern } from "./lib/rules";

type Scope = "page" | "site" | "subdomains" | "custom";

function pages(count: number): string {
  return `${count.toLocaleString()} page${count === 1 ? "" : "s"}`;
}

export function DisableIndexingForm({ url, onDone }: { url: string; onDone: () => void }) {
  const { pop } = useNavigation();
  const isWeb = /^https?:\/\//i.test(url);
  const host = isWeb ? new URL(url).hostname : "";
  const [scope, setScope] = useState<Scope>(isWeb ? "site" : "page");
  const [custom, setCustom] = useState("");
  const [alsoDelete, setAlsoDelete] = useState(false);
  const abortable = useRef<AbortController>(null);

  const generated = (from: Scope) => {
    if (from === "page") return pagePattern(url);
    if (from === "site") return sitePattern(url);
    return sitePattern(url, { subdomains: true });
  };
  const pattern = scope === "custom" ? custom.trim() : generated(scope);
  // Hister splits saved rules on whitespace, so a space would save as two rules.
  const spaceError = /\s/.test(pattern) ? "No spaces. Use \\s to match whitespace." : undefined;

  const {
    data: matched,
    isLoading: counting,
    error: countError,
  } = usePromise((value: string) => countPatternMatches(value, abortable.current?.signal), [pattern], {
    execute: Boolean(pattern) && !spaceError,
    abortable,
    onError: () => undefined,
  });

  const matchText = !pattern
    ? "Enter a pattern to see how many indexed pages it matches."
    : spaceError || countError
      ? "Fix the pattern to see how many indexed pages it matches."
      : counting || matched === undefined
        ? "Counting matching pages…"
        : `Matches ${pages(matched)} Hister has already indexed.`;

  const submit = async () => {
    if (!pattern || spaceError || countError) return;
    const toast = await showToast({ style: Toast.Style.Animated, title: "Checking matches" });
    try {
      const toDelete = alsoDelete ? await countPatternMatches(pattern) : 0;
      if (toDelete > 0) {
        await toast.hide();
        const confirmed = await confirmAlert({
          title: `Delete ${pages(toDelete)} from Hister?`,
          message: "They match the new rule. This can't be undone.",
          icon: Icon.Trash,
          primaryAction: { title: `Delete ${pages(toDelete)}`, style: Alert.ActionStyle.Destructive },
        });
        if (!confirmed) return;
        toast.show();
      }
      toast.title = "Disabling indexing";
      const added = await addSkipRule(pattern);
      const deleted = toDelete > 0 ? await deletePatternMatches(pattern) : 0;
      toast.style = Toast.Style.Success;
      toast.title = added ? "Indexing disabled" : "Already not indexed";
      toast.message = deleted ? `Deleted ${pages(deleted)}` : undefined;
      onDone();
      pop();
    } catch (error) {
      toast.style = Toast.Style.Failure;
      toast.title = "Could not disable indexing";
      toast.message = error instanceof Error ? error.message : undefined;
    }
  };

  return (
    <Form
      navigationTitle="Disable Indexing"
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Disable Indexing" icon={Icon.EyeDisabled} onSubmit={submit} />
        </ActionPanel>
      }
    >
      <Form.Description text="Hister will stop indexing pages that match. Pages it already has stay unless you delete them too." />
      <Form.Dropdown
        id="scope"
        title="Stop Indexing"
        value={scope}
        onChange={(next) => {
          if (next === "custom" && scope !== "custom") setCustom(generated(scope));
          setScope(next as Scope);
        }}
      >
        <Form.Dropdown.Item value="page" title="This page" icon={Icon.Document} />
        {isWeb && <Form.Dropdown.Item value="site" title={host} icon={Icon.Globe} />}
        {isWeb && <Form.Dropdown.Item value="subdomains" title={`${host} and its subdomains`} icon={Icon.Globe} />}
        <Form.Dropdown.Item value="custom" title="Custom pattern" icon={Icon.Code} />
      </Form.Dropdown>
      <Form.TextField
        id="pattern"
        title="Pattern"
        info="A Go regular expression. Hister skips any URL it matches anywhere, so anchor it with ^ and $ to match whole URLs."
        value={pattern}
        error={spaceError ?? countError?.message}
        onChange={(value) => {
          if (value === pattern) return;
          setCustom(value);
          setScope("custom");
        }}
      />
      <Form.Description text={matchText} />
      <Form.Checkbox
        id="alsoDelete"
        label={
          matched ? `Also delete the ${pages(matched)} already indexed` : "Also delete matching pages already indexed"
        }
        value={alsoDelete}
        onChange={setAlsoDelete}
      />
    </Form>
  );
}
