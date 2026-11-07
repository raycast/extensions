import { Icon } from "@raycast/api";
import { describeJson, formatJson, jsonToTypeScript, minifyJson, sortJsonKeys } from "./utils/toolbox";
import { InputForm } from "./components/InputForm";
import { ResultRow } from "./components/ResultList";

export default function Command() {
  return (
    <InputForm
      inputTitle="JSON"
      placeholder='{"name":"raycast","tags":["it","toolbox"],"stars":42}'
      compute={(values) => {
        const input = values.input ?? "";
        if (!input.trim()) return [];
        const rows: ResultRow[] = [];
        try {
          rows.push({
            id: "pretty",
            title: "Format JSON (2-space indent)",
            detail: formatJson(input, 2),
            icon: Icon.Code,
            copyValue: formatJson(input, 2),
          });
          rows.push({
            id: "minify",
            title: "Minify JSON",
            detail: minifyJson(input),
            icon: Icon.MinusCircle,
            copyValue: minifyJson(input),
          });
          rows.push({
            id: "sorted",
            title: "Sort Keys",
            detail: sortJsonKeys(input),
            icon: Icon.ArrowDown,
            copyValue: sortJsonKeys(input),
          });
          rows.push({
            id: "typescript",
            title: "Generate TypeScript Interfaces",
            detail: jsonToTypeScript(input),
            icon: Icon.CodeBlock,
            copyValue: jsonToTypeScript(input),
          });
          rows.push({
            id: "structure",
            title: "Structure Summary",
            detail: describeJson(input),
            icon: Icon.List,
            copyValue: describeJson(input),
          });
          rows.push({
            id: "stats",
            title: `Valid JSON · ${formatJson(input, 0).length} characters`,
            subtitle: "Syntax is valid",
            icon: Icon.CheckCircle,
          });
        } catch (error) {
          rows.push({
            id: "error",
            title: `Invalid JSON`,
            detail: (error as Error).message,
            icon: Icon.CircleDisabled,
            copyValue: (error as Error).message,
          });
        }
        return rows;
      }}
    />
  );
}
