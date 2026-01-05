import { List, Action, ActionPanel, Icon, Color, Image } from "@raycast/api";
import { useState, useMemo, useEffect } from "react";
import { usePeople } from "./utils/usePeople";
import { Person, Document, Doc } from "./utils/types";
import Unresponsive from "./templates/unresponsive";
import { getDocumentsByIds } from "./utils/fetchData";
import { NoteListItem } from "./components/NoteComponents";
import { useFavicon } from "./utils/toolHelpers";
import { formatLastMeetingLabel, sortPeople, type PeopleSortOption } from "./utils/searchUtils";

type SortOption = PeopleSortOption;

export default function Command() {
  const { people, isLoading, hasError } = usePeople();
  const [sortBy, setSortBy] = useState<SortOption>("last-meeting");

  const sortedPeople = useMemo(() => sortPeople(people, sortBy), [people, sortBy]);

  if (isLoading) {
    return <List isLoading={true} />;
  }

  if (hasError) {
    return <Unresponsive />;
  }

  return (
    <List
      isLoading={false}
      searchBarPlaceholder="Search people..."
      searchBarAccessory={
        <List.Dropdown tooltip="Sort By" storeValue={true} onChange={(value) => setSortBy(value as SortOption)}>
          <List.Dropdown.Item title="Last Meeting" value="last-meeting" icon={Icon.Calendar} />
          <List.Dropdown.Item title="Meeting Count" value="meeting-count" icon={Icon.BarChart} />
          <List.Dropdown.Item title="Name" value="name" icon={Icon.Person} />
          <List.Dropdown.Item title="Company" value="company" icon={Icon.Building} />
        </List.Dropdown>
      }
    >
      {sortedPeople.map((person) => (
        <PersonListItem key={person.id} person={person} />
      ))}
    </List>
  );
}

// Custom hook to fetch favicon for a person (only if no avatar exists)
function usePersonFavicon(person: Person) {
  const shouldFetch = !person.avatar;

  const domain = person.email ? person.email.split("@")[1] : null;

  return useFavicon(domain, Icon.PersonCircle, shouldFetch);
}

function usePersonMeetings(person: Person) {
  const [meetings, setMeetings] = useState<Document[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const fetchMeetings = async () => {
      setIsLoading(true);

      try {
        const meetingIds = person.meetingIds || [];

        if (meetingIds.length === 0) {
          if (!cancelled) {
            setMeetings([]);
            setIsLoading(false);
          }
          return;
        }

        const documents = await getDocumentsByIds(meetingIds);
        if (cancelled) return;
        const meetingIdsSet = new Set(meetingIds);
        const meetingsList = documents.filter((document) => meetingIdsSet.has(document.id));

        meetingsList.sort((a, b) => {
          const dateA = new Date(a.created_at || 0);
          const dateB = new Date(b.created_at || 0);
          return dateB.getTime() - dateA.getTime();
        });

        if (!cancelled) {
          setMeetings(meetingsList);
        }
      } catch (error) {
        if (!cancelled) {
          setMeetings([]);
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    };

    fetchMeetings();
    return () => {
      cancelled = true;
    };
  }, [person.meetingIds]);

  return { meetings, isLoading };
}

function PersonMeetingsList({ person }: { person: Person }) {
  const { meetings, isLoading } = usePersonMeetings(person);
  // Panels are loaded on-demand in NoteListItem when details are viewed

  if (isLoading) {
    return <List isLoading={true} />;
  }

  return (
    <List
      searchBarPlaceholder={`Search meetings with ${person.name}...`}
      navigationTitle={`Meetings with ${person.name}`}
    >
      {meetings.length === 0 ? (
        <List.EmptyView
          icon={{ source: Icon.Document, tintColor: Color.Blue }}
          title="No Meetings Found"
          description={`No meetings found with ${person.name}.`}
        />
      ) : (
        meetings.map((meeting) => <NoteListItem key={meeting.id} doc={meeting as Doc} />)
      )}
    </List>
  );
}

function PersonListItem({ person }: { person: Person }) {
  const { favicon } = usePersonFavicon(person);
  const accessories: List.Item.Accessory[] = [];

  if (person.meetingCount) {
    accessories.push({
      text: `${person.meetingCount} ${person.meetingCount === 1 ? "meeting" : "meetings"}`,
      icon: Icon.Calendar,
    });
  }

  const meetingLabel = formatLastMeetingLabel(person.lastMeetingDate);
  if (meetingLabel) {
    accessories.push({
      text: meetingLabel.text,
      icon: Icon.Clock,
      tooltip: meetingLabel.tooltip,
    });
  }

  return (
    <List.Item
      title={person.name}
      subtitle=""
      icon={
        person.avatar
          ? { source: person.avatar, mask: Image.Mask.Circle }
          : favicon || { source: Icon.PersonCircle, tintColor: Color.Blue }
      }
      accessories={accessories}
      actions={
        <ActionPanel>
          <Action.Push title="View Meetings" icon={Icon.Document} target={<PersonMeetingsList person={person} />} />
          <Action.CopyToClipboard
            title="Copy Email"
            content={person.email}
            shortcut={{ modifiers: ["cmd"], key: "e" }}
          />
          <Action.CopyToClipboard title="Copy Name" content={person.name} shortcut={{ modifiers: ["cmd"], key: "n" }} />
          {person.company_name && (
            <Action.CopyToClipboard
              title="Copy Company"
              content={person.company_name}
              shortcut={{ modifiers: ["cmd"], key: "c" }}
            />
          )}
          {person.links.length > 0 && person.links[0].title === "LinkedIn" && (
            <Action.OpenInBrowser
              title="Open Linkedin"
              url={`https://linkedin.com/in/${person.links[0].url}`}
              shortcut={{ modifiers: ["cmd"], key: "l" }}
            />
          )}
          <Action.CopyToClipboard
            title="Copy All Details"
            content={formatPersonDetails(person)}
            shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
          />
        </ActionPanel>
      }
    />
  );
}

function formatPersonDetails(person: Person): string {
  const details = [`Name: ${person.name}`, `Email: ${person.email}`];

  if (person.job_title) {
    details.push(`Title: ${person.job_title}`);
  }

  if (person.company_name) {
    details.push(`Company: ${person.company_name}`);
  }

  if (person.company_description) {
    details.push(`Company Description: ${person.company_description}`);
  }

  if (person.links.length > 0) {
    const linksText = person.links.map((link) => `${link.title}: ${link.url}`).join(", ");
    details.push(`Links: ${linksText}`);
  }

  return details.join("\n");
}
