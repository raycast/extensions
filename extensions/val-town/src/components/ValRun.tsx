import { Action, ActionPanel, Detail, Icon } from "@raycast/api";
import { RunVal, UserVal, Val } from "../types";
import { useRunApi } from "../hooks/useRunApi";
import { wrapCode } from "../helpers";

export const ValRun = ({ val, args }: { val: Val | RunVal | UserVal; args?: string[] }) => {
  const userName = val.author.username.replace("@", "");
  const { isLoading, data, revalidate } = useRunApi(userName, val.name, args);
  const response = typeof data === "string" ? data : JSON.stringify(data, null, 2);
  return (
    <Detail
      isLoading={isLoading}
      navigationTitle={isLoading ? "Running Val..." : "Response from API"}
      markdown={wrapCode(response)}
      actions={
        <ActionPanel>
          <Action onAction={() => revalidate()} title="Re-Run Val" icon={Icon.Play} />
          <Action.CopyToClipboard title="Copy Response" content={response} icon={Icon.Clipboard} />
        </ActionPanel>
      }
    />
  );
};
