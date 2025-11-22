import { List, Action, ActionPanel, Icon, Color, Image } from "@raycast/api";
import { useState, useMemo, useEffect } from "react";
import { usePeople } from "./utils/usePeople";
import { Person, Document, Doc } from "./utils/types";
import Unresponsive from "./templates/unresponsive";
import getCache from "./utils/getCache";
import { NoteListItem } from "./components/NoteComponents";
import { hasWorkEmailDomain } from "./utils/emailDomainUtils";
import { useFavicon } from "./utils/toolHelpers";

type SortOption = "name" | "last-meeting" | "meeting-count" | "company";

export default function Command() {
  const { people, isLoading, hasError } = usePeople();
  const [sortBy, setSortBy] = useState<SortOption>("last-meeting");

  const sortedPeople = useMemo(() => {
    const filteredPeople = people.filter(hasWorkEmailDomain);
    const peopleCopy = [...filteredPeople];

    switch (sortBy) {
      case "name":
        return peopleCopy.sort((a, b) => a.name.localeCompare(b.name));
      case "last-meeting":
        return peopleCopy.sort((a, b) => {
          const dateA = a.lastMeetingDate || "";
          const dateB = b.lastMeetingDate || "";
          return dateB.localeCompare(dateA); // Most recent first
        });
      case "meeting-count":
        return peopleCopy.sort((a, b) => (b.meetingCount || 0) - (a.meetingCount || 0));
      case "company":
        return peopleCopy.sort((a, b) => {
          const companyA = a.company_name || "zzz"; // Put empty companies at the end
          const companyB = b.company_name || "zzz";
          return companyA.localeCompare(companyB);
        });
      default:
        return peopleCopy;
    }
  }, [people, sortBy]);

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
  // Don't fetch favicon if person already has an avatar
  const shouldFetch = !person.avatar;

  // Get domain from person's email
  const domain = person.email ? person.email.split("@")[1] : null;

  return useFavicon(domain, Icon.PersonCircle, shouldFetch);
}

function usePersonMeetings(person: Person) {
  const [meetings, setMeetings] = useState<Document[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const fetchMeetings = async () => {
      setIsLoading(true);

      try {
        const meetingIds = person.meetingIds || [];

        if (meetingIds.length === 0) {
          setMeetings([]);
          setIsLoading(false);
          return;
        }

        const cacheData = await getCache();
        const meetingsList: Document[] = [];

        if (cacheData?.state?.documents) {
          Object.values(cacheData.state.documents).forEach((doc: unknown) => {
            const document = doc as Document;
            if (meetingIds.includes(document.id)) {
              meetingsList.push(document);
            }
          });
        }

        meetingsList.sort((a, b) => {
          const dateA = new Date(a.created_at || 0);
          const dateB = new Date(b.created_at || 0);
          return dateB.getTime() - dateA.getTime();
        });

        setMeetings(meetingsList);
      } catch (error) {
        setMeetings([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchMeetings();
  }, [person.meetingIds]);

  return { meetings, isLoading };
}

function PersonMeetingsList({ person }: { person: Person }) {
  const { meetings, isLoading } = usePersonMeetings(person);
  // Get fresh panels data with cache TTL
  const cacheData = getCache();
  const panels = cacheData?.state?.documentPanels;

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
        meetings.map((meeting) => <NoteListItem key={meeting.id} doc={meeting as Doc} panels={panels} />)
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

  if (person.lastMeetingDate) {
    const date = new Date(person.lastMeetingDate);
    const now = new Date();
    const daysDiff = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));

    let formattedDate: string;
    if (daysDiff === 0) {
      formattedDate = "Today";
    } else if (daysDiff === 1) {
      formattedDate = "Yesterday";
    } else if (daysDiff < 7) {
      formattedDate = date.toLocaleDateString("en-US", { weekday: "long" });
    } else {
      formattedDate = date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
    }

    accessories.push({
      text: formattedDate,
      icon: Icon.Clock,
      tooltip: `Last meeting: ${date.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}`,
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
