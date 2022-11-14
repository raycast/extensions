import { Clipboard } from "@raycast/api";
import { useEffect, useState } from "react";

export const useJSON = () => {
  const [text, setText] = useState<string>();
  useEffect(() => {
    Clipboard.readText().then(json => {
      try {
        if (!json) throw new Error("No content");
        const decoded = JSON.parse(json);
        setText(JSON.stringify(decoded, null, 2));
      } catch (error) {
        // nothing.
      }
    });
  }, []);
  return [text];
}
