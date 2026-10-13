import {
  Action,
  ActionPanel,
  Form,
  getApplications,
  getSelectedFinderItems,
  showHUD,
} from "@raycast/api";
import { useEffect, useState } from "react";
import { findApp, openInApp, planNotice, validatePaths } from "./core";
import { failure } from "./failure";
import { createLatestLoad } from "./latest-load";

export default function Command() {
  const [left, setLeft] = useState("");
  const [right, setRight] = useState("");
  const [busy, setBusy] = useState(false);
  const [finderLoad] = useState(() => createLatestLoad<[string, string]>());
  // Two items already selected in Finder fill the form; anything else leaves it for typing.
  useEffect(() => {
    void finderLoad.run(
      async () =>
        validatePaths(
          (await getSelectedFinderItems()).map((item) => item.path),
        ),
      ([first, second]) => {
        setLeft(first);
        setRight(second);
      },
      () => undefined,
    );
    return () => finderLoad.invalidate();
  }, [finderLoad]);
  async function loadFinder() {
    await finderLoad.run(
      async () =>
        validatePaths(
          (await getSelectedFinderItems()).map((file) => file.path),
        ),
      ([first, second]) => {
        setLeft(first);
        setRight(second);
      },
      (error) => failure("Select two items in Finder", error),
    );
  }
  async function submit() {
    if (busy) return;
    finderLoad.invalidate();
    setBusy(true);
    try {
      const paths = await validatePaths([left, right]);
      await openInApp(await findApp(await getApplications()), paths);
      await showHUD("Opened in Diff Anything");
    } catch (error) {
      await failure("Comparison did not open", error);
    } finally {
      setBusy(false);
    }
  }
  return (
    <Form
      isLoading={busy}
      enableDrafts={false}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Open in Diff Anything" onSubmit={submit} />
          <Action title="Use Two Selected Finder Items" onAction={loadFinder} />
          <Action
            title="Swap Left and Right"
            shortcut={{ modifiers: ["cmd", "shift"], key: "x" }}
            onAction={() => {
              finderLoad.invalidate();
              setLeft(right);
              setRight(left);
            }}
          />
        </ActionPanel>
      }
    >
      <Form.Description title="Diff Anything" text={planNotice} />
      <Form.TextField
        id="left"
        title="Left Path"
        value={left}
        onChange={(value) => {
          finderLoad.invalidate();
          setLeft(value);
        }}
        placeholder="/Users/you/Documents/before.txt"
      />
      <Form.TextField
        id="right"
        title="Right Path"
        value={right}
        onChange={(value) => {
          finderLoad.invalidate();
          setRight(value);
        }}
        placeholder="/Users/you/Documents/after.txt"
      />
    </Form>
  );
}
