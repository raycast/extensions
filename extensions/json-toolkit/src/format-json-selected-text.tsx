import { getSelectedText } from "@raycast/api";
import { useState } from "react";

import { FormatSourceCommand } from "./components/format-source-command";

export default function Command() {
  const [inputPromise] = useState(() => getSelectedText());

  return (
    <FormatSourceCommand
      sourceName="Selected text"
      inputPromise={inputPromise}
    />
  );
}
