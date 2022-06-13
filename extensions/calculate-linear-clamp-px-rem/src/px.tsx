import { Action, ActionPanel, Clipboard, Form, showHUD } from "@raycast/api";
import React from "react";

type Values = {
  min_font_size: number;
  max_font_size: number;
  min_vw_width: number;
  max_vw_width: number;
  pixels_per_rem: number;
};

function parseValue(value: number) {
  return parseFloat(value.toFixed(4));
}

export default function Command() {
  async function handleSubmit({ min_font_size, max_font_size, min_vw_width, max_vw_width, pixels_per_rem }: Values) {
    const min_font_size_rem = Number(min_font_size) / Number(pixels_per_rem);
    const max_font_size_rem = Number(max_font_size) / Number(pixels_per_rem);
    const min_vw_width_rem = Number(min_vw_width) / Number(pixels_per_rem);
    const max_vw_width_rem = Number(max_vw_width) / Number(pixels_per_rem);

    const slope = (max_font_size_rem - min_font_size_rem) / (max_vw_width_rem - min_vw_width_rem);
    const yAxisIntersection = -min_vw_width_rem * slope + min_font_size_rem;

    const clamp = `clamp(${parseValue(min_font_size_rem)}rem, ${parseValue(yAxisIntersection)}rem + ${parseValue(
      slope * 100
    )}vw, ${parseValue(max_font_size_rem)}rem)`;

    await Clipboard.copy(clamp);

    await showHUD("Clamp Copied 🎊");
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Calculate" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField id="min_font_size" title="Min Font Size" placeholder="Minimal Value In Pixels" />
      <Form.TextField id="max_font_size" title="Max Font Size" placeholder="Maximal Value In Pixels" />
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
