import { transformer } from "../helpers";
import { Util } from "../interfaces";

const sortLinesAscending: Util = {
  name: "Sort Lines Ascending",
  icon: "sort_ascending_icon.png",
  description: "Sorts lines in given text alphabetically",
  inputType: "textarea",
  transform: transformer((s: string) => {
    const lines = s.split("\n");
    lines.sort(new Intl.Collator().compare);
    return lines.join("\n");
  }),
};

export default sortLinesAscending;
