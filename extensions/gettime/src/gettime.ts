#!/usr/bin/env node

// Required parameters:
// @raycast.schemaVersion 1
// @raycast.title Test
// @raycast.mode compact

// Optional parameters:
// @raycast.icon 🤖
// @raycast.packageName Test

// Documentation:
// @raycast.author Shotaro Ozawa

import { Clipboard } from "@raycast/api";

export default async function Command() {
  await Clipboard.copy(new Date().getTime())
}