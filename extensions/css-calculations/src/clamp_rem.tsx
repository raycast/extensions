import { Action, ActionPanel, Clipboard, Form, showHUD } from "@raycast/api";
import React from "react";
import { useErrors } from "./hooks";
import { calculateClamp, validateAllValues, validateValue, Values } from "./utils";

export default function Command() {
  const {
    minFontSizeError,
    setMinFontSizeError,
    maxFontSizeError,
    setMaxFontSizeError,
    minViewportWidthError,
    setMinViewportWidthError,
    maxViewportWidthError,
    setMaxViewportWidthError,
    pxPerRemError,
    setPxPerRemError,
    setErrorByKey,
  } = useErrors();

  async function handleSubmit(values: Values) {
    const errors = validateAllValues(values);

    if (errors.length) {
      errors.forEach(({ key, value }) => {
        setErrorByKey(key, value);
      });
      return;
    }

    const clamp = calculateClamp(values, "rem");
    await Clipboard.copy(clamp);

    await showHUD("Clamp Copied 🎊");
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Copy Clamp" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="min_font_size"
        title="Min Font Size"
        placeholder="Minimal Value In Rems"
        error={minFontSizeError}
        onChange={(value) => {
          const error = validateValue("min_font_size", Number(value));
          setMinFontSizeError(error);
        }}
      />
      <Form.TextField
        id="max_font_size"
        title="Max Font Size"
        placeholder="Maximal Value In Rems"
        error={maxFontSizeError}
        onChange={(value) => {
          const error = validateValue("max_font_size", Number(value));
          setMaxFontSizeError(error);
        }}
      />
      <Form.TextField
        id="min_vw_width"
        title="Min Viewport Width"
        placeholder="Minimal Value In Rems"
        defaultValue="375"
        error={minViewportWidthError}
        onChange={(value) => {
          const error = validateValue("min_vw_width", Number(value));
          setMinViewportWidthError(error);
        }}
      />
      <Form.TextField
        id="max_vw_width"
        title="Max Viewport Width"
        placeholder="Maximal Value In Rems"
        defaultValue="1400"
        error={maxViewportWidthError}
        onChange={(value) => {
          const error = validateValue("max_vw_width", Number(value));
          setMaxViewportWidthError(error);
        }}
      />
      <Form.TextField
        id="pixels_per_rem"
        title="Base Font Size"
        placeholder="Pixels Per Rem"
        defaultValue="16"
        error={pxPerRemError}
        onChange={(value) => {
          const error = validateValue("pixels_per_rem", Number(value));
          setPxPerRemError(error);
        }}
      />
    </Form>
  );
}
