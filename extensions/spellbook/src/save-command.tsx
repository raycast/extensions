import { useEffect, useState } from "react";

import { Clipboard, Form } from "@raycast/api";

import CommandForm from "./components/CommandForm";
import { looksLikeShellCommand } from "./lib/clipboard";

export default function SaveCommand() {
  const [prefill, setPrefill] = useState<string | undefined>(undefined);

  useEffect(() => {
    let cancelled = false;
    Clipboard.readText()
      .then((text) => {
        if (!cancelled) {
          setPrefill(looksLikeShellCommand(text) ? text.trim() : "");
        }
      })
      .catch(() => {
        if (!cancelled) {
          setPrefill("");
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (prefill === undefined) {
    return <Form isLoading />;
  }
  return <CommandForm prefillTemplate={prefill} popToRootAfterSave />;
}
