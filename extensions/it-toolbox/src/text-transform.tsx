import { Icon } from "@raycast/api";
import {
  dedupeLines,
  previewMultiline,
  removeEmptyLines,
  reverseText,
  sortLines,
  textStats,
  trimLines,
} from "./utils/toolbox";
import { InputForm } from "./components/InputForm";
import { ResultRow } from "./components/ResultList";

export default function Command() {
  return (
    <InputForm
      inputTitle="Text"
      placeholder="One item per line; multi-line paste is supported"
      compute={(values) => {
        const input = values.input ?? "";
        if (!input) return [];
        const stats = textStats(input);
        const candidates: Array<{ id: string; label: string; icon: Icon; value: string }> = [
          { id: "upper", label: "UPPERCASE", icon: Icon.ArrowUp, value: input.toUpperCase() },
          { id: "lower", label: "lowercase", icon: Icon.ArrowDown, value: input.toLowerCase() },
          { id: "reverse", label: "Reverse characters", icon: Icon.ArrowClockwise, value: reverseText(input) },
          { id: "dedupe", label: "Dedupe lines", icon: Icon.Filter, value: dedupeLines(input) },
          {
            id: "dedupe-ci",
            label: "Dedupe lines (case-insensitive)",
            icon: Icon.Filter,
            value: dedupeLines(input, false),
          },
          { id: "no-empty", label: "Remove empty lines", icon: Icon.MinusCircle, value: removeEmptyLines(input) },
          { id: "trim", label: "Trim each line", icon: Icon.MinusCircle, value: trimLines(input) },
          { id: "sort", label: "Sort lines A→Z", icon: Icon.ArrowDown, value: sortLines(input) },
          { id: "sort-desc", label: "Sort lines Z→A", icon: Icon.ArrowUp, value: sortLines(input, true) },
          {
            id: "join",
            label: "Join into one line",
            icon: Icon.Bookmark,
            value: input
              .split("\n")
              .map((l) => l.trim())
              .filter(Boolean)
              .join(" "),
          },
          {
            id: "sql-in",
            label: "To SQL IN list",
            icon: Icon.Code,
            value: input
              .split("\n")
              .filter((l) => l.trim())
              .map((l) => `'${l.trim().replace(/'/g, "''")}'`)
              .join(", "),
          },
          {
            id: "csv-line",
            label: "To CSV row",
            icon: Icon.Document,
            value: input
              .split("\n")
              .filter((l) => l.trim())
              .map((l) => `"${l.trim().replace(/"/g, '""')}"`)
              .join(","),
          },
        ];

        const rows: ResultRow[] = candidates.map((item) => ({
          id: item.id,
          title: previewMultiline(item.value),
          subtitle: item.label,
          detail: item.value,
          icon: item.icon,
          copyValue: item.value,
        }));

        rows.push({
          id: "stats",
          title: `${stats.chars} chars / ${stats.words} words / ${stats.lines} lines / ${stats.bytes} bytes`,
          subtitle: `Without whitespace: ${stats.charsNoSpace} chars · CJK: ${stats.cjk} · Non-empty lines: ${stats.nonEmptyLines}`,
          icon: Icon.Gauge,
        });
        return rows;
      }}
    />
  );
}
