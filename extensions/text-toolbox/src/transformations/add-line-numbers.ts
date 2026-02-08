import { Transformation } from "./types";

export const addLineNumbers: Transformation = {
  id: "add-line-numbers",
  name: "Add Line Numbers",
  description: "Prefix each line with number",
  icon: "list-bullet",
  transform: (text) => {
    const lines = text.split("\n");
    const maxDigits = lines.length.toString().length;
    return lines.map((line, index) => `${String(index + 1).padStart(maxDigits, " ")}. ${line}`).join("\n");
  },
  preferenceKey: "enableAddLineNumbers",
};
