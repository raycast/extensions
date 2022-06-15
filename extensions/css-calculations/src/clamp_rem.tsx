import React from "react";
import { Action, ActionPanel, Clipboard, Form, showHUD, showToast, Toast } from "@raycast/api";
import { calculateClamp, validateValues, Values } from "./utils";

export default function Command() {
  async function handleSubmit(values: Values) {
    try {
      validateValues(values);

      const clamp = calculateClamp(values, "rem");
      await Clipboard.copy(clamp);

      await showHUD("Clamp Copied 🎊");
    } catch (error: any) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Error!",
        message: error.message,
      });
    }
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Calculate" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField id="min_font_size" title="Min Font Size" placeholder="Minimal Value In Rems" />
      <Form.TextField id="max_font_size" title="Max Font Size" placeholder="Maximal Value In Rems" />
      <Form.TextField
        id="min_vw_width"
        title="Min Viewport Width"
        placeholder="Minimal Value In Pixels"
        defaultValue="375"
      />
      <Form.TextField
        id="max_vw_width"
        title="Max Viewport Width"
        placeholder="Maximal Value In Pixels"
        defaultValue="1400"
      />
      <Form.TextField id="pixels_per_rem" title="Base Font Size" placeholder="Pixels Per Rem" defaultValue="16" />
    </Form>
  );
}
