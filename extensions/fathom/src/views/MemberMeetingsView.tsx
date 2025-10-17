import { List, Icon } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { useState } from "react";
import { listMeetings } from "../fathom/api";
import { MeetingListItem } from "../components/MeetingListItem";

interface MemberMeetingsProps {
  email: string;
  name: string;
}

export default function MemberMeetingsView({ email, name }: MemberMeetingsProps) {
  const [filterType, setFilterType] = useState<string>("all");

  const memberEmail = email;
  const memberName = name;

  if (!memberEmail) {
    return (
      <List>
        <List.EmptyView
          icon={Icon.Person}
          title="No Member Selected"
          description="This command should be launched from a team member's actions"
        />
      </List>
    );
  }

  // Fetch meetings recorded by this member
  const {
    data: recordedData,
    isLoading: recordedLoading,
    error: recordedError,
  } = useCachedPromise(async (email: string) => await listMeetings({ recordedBy: [email] }), [memberEmail], {
    keepPreviousData: false,
  });

  // Fetch meetings where this member was invited
  const {
    data: invitedData,
    isLoading: invitedLoading,
    error: invitedError,
  } = useCachedPromise(async (email: string) => await listMeetings({ calendarInvitees: [email] }), [memberEmail], {
    keepPreviousData: false,
  });

  const recordedMeetings = recordedData?.items ?? [];
  const invitedMeetings = invitedData?.items ?? [];
  const isLoading = recordedLoading || invitedLoading;
  const error = recordedError || invitedError;

  const totalMeetings = recordedMeetings.length + invitedMeetings.length;

  // Determine which sections to show based on filter
  const showRecorded = filterType === "all" || filterType === "recorded";
  const showInvited = filterType === "all" || filterType === "invited";

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Search meetings by title..."
      filtering={true}
      navigationTitle={memberName ? `Meetings: ${memberName}` : "Member Meetings"}
      searchBarAccessory={
        <List.Dropdown tooltip="Filter Meeting Type" value={filterType} onChange={setFilterType}>
          <List.Dropdown.Item title="All Meetings" value="all" icon={Icon.List} />
          <List.Dropdown.Item title="Recorded By" value="recorded" icon={Icon.Video} />
          <List.Dropdown.Item title="Invited To" value="invited" icon={Icon.Person} />
        </List.Dropdown>
      }
    >
      {error ? (
        <List.EmptyView
          icon={Icon.ExclamationMark}
          title={
            error instanceof Error && error.message.includes("Rate limit")
              ? "Rate Limit Exceeded"
              : "Failed to Load Meetings"
          }
          description={
            error instanceof Error && error.message.includes("Rate limit")
              ? "You've made too many requests. Please wait a moment and try again."
              : error instanceof Error
                ? error.message
                : String(error)
          }
        />
      ) : totalMeetings === 0 ? (
        <List.EmptyView
          icon={Icon.Calendar}
          title="No Meetings Found"
          description={memberName ? `No meetings found for ${memberName}` : "No meetings found for this member"}
        />
      ) : (
        <>
          {showRecorded && recordedMeetings.length > 0 && (
            <List.Section
              title={memberName ? `Recorded by ${memberName}` : "Recorded Meetings"}
              subtitle={`${recordedMeetings.length} meetings`}
            >
              {recordedMeetings.map((meeting) => (
                <MeetingListItem key={`recorded-${meeting.id}`} meeting={meeting} />
              ))}
            </List.Section>
          )}

          {showInvited && invitedMeetings.length > 0 && (
            <List.Section title="Invited To" subtitle={`${invitedMeetings.length} meetings`}>
              {invitedMeetings.map((meeting) => (
                <MeetingListItem key={`invited-${meeting.id}`} meeting={meeting} />
              ))}
            </List.Section>
          )}
        </>
      )}
    </List>
  );
}
