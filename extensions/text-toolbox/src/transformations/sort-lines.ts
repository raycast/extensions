import { Transformation } from "./types";

export const sortLines: Transformation = {
  id: "sort-lines",
  name: "Sort Lines Alphabetically",
  description: "Sort lines A-Z",
  icon: "list-bullet",
  transform: (text) => {
    const lines = text.split("\n");
    return lines.sort((a, b) => a.localeCompare(b)).join("\n");
  },
  preferenceKey: "enableSortLines",
};
