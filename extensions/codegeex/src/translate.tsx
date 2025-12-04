import { Detail, ActionPanel, Action } from "@raycast/api";
import { codeTranslateApi } from "./api";
import { useSearch, onCopy, useSelect } from "./hooks";

export default function Command() {
  const { onSearchTextChange, code, rawCode, isLoading, setCode } = useSearch({
    api: codeTranslateApi,
    generatePrompt: (e: string) => e,
  });
  useSelect({ onSearchTextChange, setCode });
  const copy = () => onCopy({ rawCode });
  return (
    <Detail
      actions={
        code && (
          <ActionPanel>
            <Action title="Copy" onAction={copy} />
          </ActionPanel>
        )
      }
      markdown={code}
      isLoading={isLoading}
    />
  );
}
