import {
  Action,
  ActionPanel,
  AI,
  environment,
  Form,
  showToast,
  Toast,
  useNavigation,
} from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { useEffect, useRef, useState } from "react";
import type { Scope } from "./engine";
import { interpretNaturalSearch, NaturalSearch } from "./natural-language";

export function NaturalSearchForm({
  initialPrompt,
  scope,
  onSearch,
}: {
  initialPrompt: string;
  scope: Scope;
  onSearch: (search: NaturalSearch) => void;
}) {
  const { pop } = useNavigation();
  const [loading, setLoading] = useState(false);
  const pending = useRef<AbortController | null>(null);
  const canUseAI = environment.canAccess(AI);

  useEffect(
    () => () => {
      const controller = pending.current;
      pending.current = null;
      controller?.abort();
    },
    [],
  );

  async function submit(values: { description: string }) {
    if (pending.current) return;
    if (!canUseAI) {
      await showFailureToast(
        new Error(
          "Raycast AI access is required. Standard file search remains available.",
        ),
        { title: "AI Search Unavailable" },
      );
      return;
    }
    const controller = new AbortController();
    pending.current = controller;
    setLoading(true);
    let timedOut = false;
    const timeout = setTimeout(() => {
      timedOut = true;
      controller.abort();
    }, 15_000);
    try {
      const result = await interpretNaturalSearch(
        values.description,
        scope,
        (prompt, signal) => AI.ask(prompt, { creativity: "none", signal }),
        controller.signal,
      );
      if (pending.current !== controller) return;
      pending.current = null;
      onSearch(result);
      pop();
      await showToast({
        style: Toast.Style.Success,
        title: "Search Translated",
        message: result.query,
      });
    } catch (error) {
      if (pending.current !== controller) return;
      await showFailureToast(
        timedOut
          ? new Error("AI search timed out. Your description is unchanged.")
          : error,
        { title: "Could Not Translate Search" },
      );
    } finally {
      clearTimeout(timeout);
      if (pending.current === controller) {
        pending.current = null;
        setLoading(false);
      }
    }
  }

  return (
    <Form
      navigationTitle="Search with AI"
      isLoading={loading}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Translate and Search" onSubmit={submit} />
        </ActionPanel>
      }
    >
      <Form.TextArea
        id="description"
        title="Describe Your Files"
        defaultValue={initialPrompt}
        placeholder="PDFs from Downloads modified in the last week"
      />
      <Form.Description
        title="Privacy"
        text="Only this description is sent to Raycast AI. Your file index and file contents stay on your Mac. The translated filters will appear in the search bar."
      />
      <Form.Description
        title="AI Access"
        text={
          canUseAI
            ? "Uses your Raycast AI access. Plain file search also works without AI."
            : "Raycast AI access is required for translation. Plain file search works without it."
        }
      />
    </Form>
  );
}
