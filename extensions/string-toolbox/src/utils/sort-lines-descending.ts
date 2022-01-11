import { transformer } from "../helpers";
import { Util } from "../interfaces";

const sortLinesDescending: Util = {
  name: "Sort Lines Descending",
  icon: "sort_descending_icon.png",
  description: "Sorts lines in given text alphabetically",
  inputType: "textarea",
  transform: transformer((s: string) => {
    const lines = s.split("\n");
    lines.sort(new Intl.Collator().compare).reverse();
    return lines.join("\n");
  }),
};

export default sortLinesDescending;
