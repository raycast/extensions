import {
  Action,
  ActionPanel,
  Color,
  Icon,
  List,
  getPreferenceValues,
} from "@raycast/api";
import { Requester, Preferences } from "../utils/types";
import RequesterDetail from "../requester-detail";

interface RequesterListItemProps {
  requester: Requester;
  keywords?: string[];
}

export default function RequesterListItem({
  requester,
  keywords,
}: RequesterListItemProps) {
  const { domain } = getPreferenceValues<Preferences>();
  const distinctDomain = domain.replace(/^https?:\/\//, "").replace(/\/$/, "");

  const fullName =
    `${requester.first_name || ""} ${requester.last_name || ""}`.trim() ||
    "No Name";

  return (
    <List.Item
      title={fullName}
      subtitle={requester.primary_email}
      icon={{ source: Icon.Person, tintColor: Color.Blue }}
      keywords={keywords}
      accessories={[
        ...(requester.job_title
          ? [
              {
                tag: { value: requester.job_title, color: Color.SecondaryText },
                tooltip: "Job Title",
              },
            ]
          : []),
        ...(requester.is_agent
          ? [
              {
                tag: { value: "Agent", color: Color.Purple },
                tooltip: "Is Agent",
              },
            ]
          : []),
      ]}
      actions={
        <ActionPanel>
          <Action.Push
            title="View Details"
            icon={Icon.Eye}
            target={<RequesterDetail requester={requester} />}
          />
          <Action.OpenInBrowser
            title="Open Profile in Browser"
            url={`https://${distinctDomain}/itil/requesters/${requester.id}`}
          />
          <Action.CopyToClipboard
            title="Copy Email"
            content={requester.primary_email}
            shortcut={{ modifiers: ["cmd"], key: "c" }}
          />
        </ActionPanel>
      }
    />
  );
}
