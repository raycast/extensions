import { Clipboard } from "@raycast/api";
import { useState } from "react";

import { FormatSourceCommand } from "./components/format-source-command";

export default function Command() {
  const [inputPromise] = useState(() => Clipboard.readText());

  return (
    <FormatSourceCommand sourceName="Clipboard" inputPromise={inputPromise} />
  );
}
