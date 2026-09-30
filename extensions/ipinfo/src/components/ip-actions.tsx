import { Action, ActionPanel, launchCommand, LaunchType } from "@raycast/api";
import { IPinfo, IPinfoLite } from "node-ipinfo/dist/src/common";

interface IPActionsProps {
  ipInfo: IPinfoLite | IPinfo;
  shouldAllowClearHistory?: boolean;
  onClearHistory?: () => void;
  allowFullLookup?: boolean;
}

export const IPActions = ({
  ipInfo,
  shouldAllowClearHistory = false,
  onClearHistory,
  allowFullLookup = false,
}: IPActionsProps) => {
  return (
    <ActionPanel title="IP Details">
      <Action.CopyToClipboard title="Copy IP" content={ipInfo?.ip || ""} />
      <Action.CopyToClipboard title="Copy JSON" content={JSON.stringify(ipInfo, null, 2)} />
      {shouldAllowClearHistory && onClearHistory && <Action title="Clear History" onAction={() => onClearHistory()} />}
      {allowFullLookup && (
        <Action
          title="Full IP Lookup"
          onAction={() =>
            launchCommand({ name: "ip-info", type: LaunchType.UserInitiated, arguments: { ipAddress: ipInfo.ip } })
          }
        />
      )}
    </ActionPanel>
  );
};
