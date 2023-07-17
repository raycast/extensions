import { Detail } from "@raycast/api";
import { codeExplainApi } from "./api";
import { useSearch, useSelect } from "./hooks";
export default function Command() {
  const { onSearchTextChange, code, isLoading, setCode } = useSearch({
    api: codeExplainApi,
    generatePrompt: (e: string) => e,
  });
  useSelect({ onSearchTextChange, setCode });

  return <Detail markdown={code} isLoading={isLoading} />;
}
