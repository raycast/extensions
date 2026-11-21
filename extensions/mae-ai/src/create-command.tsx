import { useState } from "react";
import ToolCommand from "./components/tool-command";
import ToolEditor from "./components/tool-editor";
import { Tool } from "./lib/tools";

export default function Command() {
  const [saved, setSaved] = useState<Tool>();
  return saved ? (
    <ToolCommand id={saved.id} />
  ) : (
    <ToolEditor closeOnSave={false} onSave={setSaved} />
  );
}
