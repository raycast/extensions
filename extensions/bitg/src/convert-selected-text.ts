// SPDX-FileCopyrightText: 2026 dtwinuz and bitg contributors
//
// SPDX-License-Identifier: MIT OR Apache-2.0

import { Clipboard, getSelectedText, showHUD } from "@raycast/api";

import { convert } from "./engine";

export default async function Command() {
  let text = "";
  try {
    text = await getSelectedText();
  } catch {
    text = "";
  }
  if (!text.trim()) {
    await showHUD("Select some text first");
    return;
  }

  const out = await convert(text);
  if (out === text) {
    await showHUD("Already in the new alphabet");
    return;
  }
  await Clipboard.paste(out);
  await showHUD("Converted to the new alphabet");
}
