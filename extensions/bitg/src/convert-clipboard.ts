// SPDX-FileCopyrightText: 2026 dtwinuz and bitg contributors
//
// SPDX-License-Identifier: MIT OR Apache-2.0

import { Clipboard, showHUD } from "@raycast/api";

import { convert } from "./engine";

export default async function Command() {
  const text = await Clipboard.readText();
  if (!text?.trim()) {
    await showHUD("Clipboard has no text");
    return;
  }

  const out = await convert(text);
  if (out === text) {
    await showHUD("Already in the new alphabet");
    return;
  }
  await Clipboard.copy(out);
  await showHUD("Copied text in the new alphabet");
}
