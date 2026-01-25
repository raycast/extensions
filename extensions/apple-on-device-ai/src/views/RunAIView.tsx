import { Action, ActionPanel, Detail, popToRoot } from "@raycast/api";
import useOnDeviceAI from "../hooks/useOnDeviceAI";

export default function RunAIView({ prompt }: { prompt: (selection: string) => string }) {
  const { isLoading, data, error } = useOnDeviceAI(prompt);

  return (
    <Detail
      isLoading={isLoading}
      markdown={data || (error && error.message) || "Loading..."}
      actions={
        <ActionPanel>
          {data && (
            <>
              <Action.Paste content={data} onPaste={() => popToRoot({ clearSearchBar: true })} />
              <Action.CopyToClipboard content={data} onCopy={() => popToRoot({ clearSearchBar: true })} />
            </>
          )}
        </ActionPanel>
      }
    />
  );
}
