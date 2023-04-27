import { useState } from "react";
import { Detail } from "@raycast/api";
import { SelectTerminalApp } from "./SelectTermnialApp";

export default function ChooseTerminalApp() {
  const [terminalAppName, setTerminalAppName] = useState<string>("");

  if (!terminalAppName) {
    return <SelectTerminalApp setTerminalAppName={setTerminalAppName} />;
  }

  return (
    <Detail
      markdown={`
  ## You setup **${terminalAppName}** as your default terminal app 🎉
  `}
    />
  );
}
