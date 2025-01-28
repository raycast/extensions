import { Action, ActionPanel, Detail } from "@raycast/api";
import KSUID from "ksuid";

export default function TestCommand() {
  const ksuid = KSUID.randomSync().string;
  console.log(ksuid);
  return (
    <Detail
      markdown={`# ${ksuid}`}
      actions={
        <ActionPanel>
          <Action.CopyToClipboard content={ksuid} />
        </ActionPanel>
      }
    />
  );
}
