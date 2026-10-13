import {
  Action,
  ActionPanel,
  Clipboard,
  environment,
  Form,
  getApplications,
  showHUD,
} from "@raycast/api";
import { useEffect, useState } from "react";
import { failure } from "./failure";
import { createLatestLoad } from "./latest-load";
import { findApp, openInApp, planNotice, writeTextPair } from "./core";

export default function Command() {
  const [left, setLeft] = useState("");
  const [right, setRight] = useState("");
  const [busy, setBusy] = useState(false);
  const [clipboardLoads] = useState(() => ({
    left: createLatestLoad<string>(),
    right: createLatestLoad<string>(),
  }));
  useEffect(
    () => () => {
      clipboardLoads.left.invalidate();
      clipboardLoads.right.invalidate();
    },
    [clipboardLoads],
  );
  async function paste(side: "left" | "right") {
    await clipboardLoads[side].run(
      async () => {
        const value = await Clipboard.readText();
        if (value === undefined)
          throw new Error("The clipboard contains no text.");
        return value;
      },
      side === "left" ? setLeft : setRight,
      (error) => failure("Cannot read clipboard text", error),
    );
  }
  async function submit() {
    if (busy) return;
    clipboardLoads.left.invalidate();
    clipboardLoads.right.invalidate();
    setBusy(true);
    try {
      const app = await findApp(await getApplications());
      await openInApp(
        app,
        await writeTextPair(left, right, environment.supportPath),
      );
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
          <Action
            title="Load Clipboard into Left"
            onAction={() => paste("left")}
          />
          <Action
            title="Load Clipboard into Right"
            onAction={() => paste("right")}
          />
        </ActionPanel>
      }
    >
      <Form.Description title="Diff Anything" text={planNotice} />
      <Form.Description
        title="Text files"
        text="Both texts are saved as private files in this extension's folder on your Mac so Diff Anything can open them. A later text comparison removes them after a day. Clipboard text is read only when you choose a Load Clipboard action."
      />
      <Form.TextArea
        id="left"
        title="Left Text"
        value={left}
        onChange={(value) => {
          clipboardLoads.left.invalidate();
          setLeft(value);
        }}
      />
      <Form.TextArea
        id="right"
        title="Right Text"
        value={right}
        onChange={(value) => {
          clipboardLoads.right.invalidate();
          setRight(value);
        }}
      />
    </Form>
  );
}
