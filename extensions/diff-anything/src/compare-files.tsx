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

export default function Command() {
  const [left, setLeft] = useState("");
  const [right, setRight] = useState("");
  const [busy, setBusy] = useState(false);
  // Two items already selected in Finder fill the form; anything else leaves it for typing.
  useEffect(() => {
    getSelectedFinderItems()
      .then((items) => validatePaths(items.map((item) => item.path)))
      .then(([first, second]) => {
        setLeft((value) => value || first);
        setRight((value) => value || second);
      })
      .catch(() => undefined);
  }, []);
  async function loadFinder() {
    try {
      const paths = await validatePaths(
        (await getSelectedFinderItems()).map((file) => file.path),
      );
      setLeft(paths[0]);
      setRight(paths[1]);
    } catch (error) {
      await failure("Select two items in Finder", error);
    }
  }
  async function submit() {
    if (busy) return;
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
        onChange={setLeft}
        placeholder="/Users/you/Documents/before.txt"
      />
      <Form.TextField
        id="right"
        title="Right Path"
        value={right}
        onChange={setRight}
        placeholder="/Users/you/Documents/after.txt"
      />
    </Form>
  );
}
