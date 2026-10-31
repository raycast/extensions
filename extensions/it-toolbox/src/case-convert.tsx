import { Icon } from "@raycast/api";
import { CASE_LABELS, CaseStyle, convertCase, splitWords } from "./utils/toolbox";
import { InputForm } from "./components/InputForm";
import { ResultRow } from "./components/ResultList";

export default function Command() {
  return (
    <InputForm
      inputTitle="Text"
      placeholder="user profile avatar url"
      compute={(values) => {
        const input = (values.input ?? "").trim();
        if (!input) return [];
        const rows = (Object.keys(CASE_LABELS) as CaseStyle[]).map<ResultRow>((style) => ({
          id: style,
          title: convertCase(input, style),
          subtitle: CASE_LABELS[style],
          icon: Icon.Bookmark,
          copyValue: convertCase(input, style),
        }));
        rows.push({
          id: "words",
          title: splitWords(input).join(" | "),
          subtitle: `${splitWords(input).length} words`,
          icon: Icon.List,
          copyValue: splitWords(input).join(","),
        });
        return rows;
      }}
    />
  );
}
