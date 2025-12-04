import { List, Action, ActionPanel, Icon, Color } from "@raycast/api";
import { useState, useMemo, useEffect } from "react";
import { usePeople } from "./utils/usePeople";
import { Company, Document, Doc, PanelsByDocId } from "./utils/types";
import Unresponsive from "./templates/unresponsive";
import getCache from "./utils/getCache";
import { NoteListItem } from "./components/NoteComponents";
import { hasWorkEmailDomain as hasWorkEmailDomainForPerson } from "./utils/emailDomainUtils";
import { useFavicon } from "./utils/toolHelpers";

type CompanySortOption = "name" | "people-count" | "meeting-count" | "last-meeting";

export default function Command() {
  const { companies, isLoading, hasError } = usePeople();
  const [sortBy, setSortBy] = useState<CompanySortOption>("meeting-count");

  const sortedCompanies = useMemo(() => {
    const filteredCompanies = companies.filter(hasWorkEmailDomain);
    const companiesCopy = [...filteredCompanies];

    switch (sortBy) {
      case "name":
        return companiesCopy.sort((a, b) => a.name.localeCompare(b.name));
      case "people-count":
        return companiesCopy.sort((a, b) => b.people.length - a.people.length);
      case "meeting-count":
        return companiesCopy.sort((a, b) => (b.totalMeetings || 0) - (a.totalMeetings || 0));
      case "last-meeting":
        return companiesCopy.sort((a, b) => {
          const dateA = a.lastMeetingDate || "";
          const dateB = b.lastMeetingDate || "";
          return dateB.localeCompare(dateA); // Most recent first
        });
      default:
        return companiesCopy;
    }
  }, [companies, sortBy]);

  if (isLoading) {
    return <List isLoading={true} />;
  }

  if (hasError) {
    return <Unresponsive />;
  }

  return (
    <List
      isLoading={false}
      searchBarPlaceholder="Search companies..."
      searchBarAccessory={
        <List.Dropdown tooltip="Sort By" storeValue={true} onChange={(value) => setSortBy(value as CompanySortOption)}>
          <List.Dropdown.Item title="Meeting Count" value="meeting-count" icon={Icon.BarChart} />
          <List.Dropdown.Item title="Last Meeting" value="last-meeting" icon={Icon.Calendar} />
          <List.Dropdown.Item title="People Count" value="people-count" icon={Icon.TwoPeople} />
          <List.Dropdown.Item title="Company Name" value="name" icon={Icon.Building} />
        </List.Dropdown>
      }
    >
      {sortedCompanies.map((company) => (
        <CompanyListItem key={company.name} company={company} />
      ))}
    </List>
  );
}

function hasWorkEmailDomain(company: Company): boolean {
  // If company name is a domain (domain-based company), consider it work-related
  if (company.name.includes(".") && !company.name.includes(" ")) {
    return true;
  }

  return company.people.some(hasWorkEmailDomainForPerson);
}

// Custom hook to fetch favicon for a company (companies don't have cached avatars, so always try favicon for work domains)
function useCompanyFavicon(company: Company) {
  // Try to get domain from company name first (if it's a domain-based company)
  const isDomainCompany = company.name.includes(".") && !company.name.includes(" ");

  let domain = "";
  if (isDomainCompany) {
    domain = company.name;
  } else if (company.people.length > 0 && company.people[0].email) {
    // Try to get domain from the first person's email
    const email = company.people[0].email;
    const emailDomain = email.split("@")[1];
    if (emailDomain) {
      domain = emailDomain;
    }
  }

  return useFavicon(domain, Icon.Building, true);
}

function useCompanyMeetings(company: Company) {
  const [meetings, setMeetings] = useState<Document[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const fetchMeetings = async () => {
      setIsLoading(true);

      try {
        const meetingIds = new Set<string>();
        company.people.forEach((person) => {
          if (person.meetingIds) {
            person.meetingIds.forEach((id) => meetingIds.add(id));
          }
        });

        if (meetingIds.size === 0) {
          setMeetings([]);
          setIsLoading(false);
          return;
        }

        const cacheData = await getCache();
        const meetingsList: Document[] = [];

        if (cacheData?.state?.documents) {
          Object.values(cacheData.state.documents).forEach((doc: unknown) => {
            const document = doc as Document;
            if (meetingIds.has(document.id)) {
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
  }, [company]);

  return { meetings, isLoading };
}

function CompanyMeetingsList({ company }: { company: Company }) {
  const { meetings, isLoading: meetingsLoading } = useCompanyMeetings(company);

  // Get fresh panels data with cache TTL
  let panels: PanelsByDocId = {};
  try {
    const cacheData = getCache();
    panels = cacheData?.state?.documentPanels || {};
  } catch (error) {
    panels = {};
  }

  if (meetingsLoading) {
    return <List isLoading={true} />;
  }

  return (
    <List
      searchBarPlaceholder={`Search meetings with ${company.name}...`}
      navigationTitle={`Meetings with ${company.name}`}
    >
      {meetings.length === 0 ? (
        <List.EmptyView
          icon={{ source: Icon.Document, tintColor: Color.Blue }}
          title="No Meetings Found"
          description={`No meetings found for ${company.name}.`}
        />
      ) : (
        meetings.map((meeting) => <NoteListItem key={meeting.id} doc={meeting as Doc} panels={panels} />)
      )}
    </List>
  );
}

function CompanyListItem({ company }: { company: Company }) {
  const { favicon } = useCompanyFavicon(company);
  const peopleNames = company.people.map((p) => p.name).join(", ");

  let subtitle = "";
  if (company.people.length > 0 && company.people[0].email) {
    const email = company.people[0].email;
    const domain = email.split("@")[1];
    if (domain) {
      subtitle = domain;
    }
  }

  // If the company name is a domain (no subtitle yet means it's a domain-based company)
  // then use the domain as both title and subtitle
  const displayTitle = company.name;
  const isDomainCompany = company.name.includes(".") && !company.name.includes(" ");

  if (isDomainCompany && !subtitle) {
    // This is a domain-based company, use domain as subtitle too
    subtitle = company.name;
  }

  const accessories: List.Item.Accessory[] = [];

  // Add last meeting date first (to match Granola app order)
  if (company.lastMeetingDate) {
    const date = new Date(company.lastMeetingDate);
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
      tooltip: `Last meeting: ${date.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}`,
    });
  }

  if (company.totalMeetings) {
    accessories.push({
      text: `${company.totalMeetings}`,
      tooltip: `${company.totalMeetings} ${company.totalMeetings === 1 ? "meeting" : "meetings"}`,
    });
  }

  return (
    <List.Item
      title={displayTitle}
      subtitle={subtitle}
      icon={favicon || { source: Icon.Building, tintColor: Color.Blue }}
      accessories={accessories}
      detail={
        <List.Item.Detail
          metadata={
            <List.Item.Detail.Metadata>
              <List.Item.Detail.Metadata.Label title="Company" text={company.name} />
              {company.description && (
                <List.Item.Detail.Metadata.Label title="Description" text={company.description} />
              )}
              <List.Item.Detail.Metadata.Separator />
              <List.Item.Detail.Metadata.Label title="People" />
              {company.people.map((person) => (
                <List.Item.Detail.Metadata.Label
                  key={person.id}
                  title={person.name}
                  text={person.job_title || person.email}
                  icon={person.avatar ? { source: person.avatar } : Icon.PersonCircle}
                />
              ))}
            </List.Item.Detail.Metadata>
          }
        />
      }
      actions={
        <ActionPanel>
          <Action.Push title="View Meetings" icon={Icon.Document} target={<CompanyMeetingsList company={company} />} />
          <Action.CopyToClipboard
            title="Copy Company Name"
            content={company.name}
            shortcut={{ modifiers: ["cmd"], key: "c" }}
          />
          <Action.CopyToClipboard
            title="Copy People Names"
            content={peopleNames}
            shortcut={{ modifiers: ["cmd"], key: "n" }}
          />
          <Action.CopyToClipboard
            title="Copy All Details"
            content={formatCompanyDetails(company)}
            shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
          />
          {company.people.length === 1 &&
            company.people[0].links.length > 0 &&
            company.people[0].links[0].title === "LinkedIn" && (
              <Action.OpenInBrowser
                title="Open Linkedin"
                url={`https://linkedin.com/in/${company.people[0].links[0].url}`}
                shortcut={{ modifiers: ["cmd"], key: "l" }}
              />
            )}
        </ActionPanel>
      }
    />
  );
}

function formatCompanyDetails(company: Company): string {
  const details = [`Company: ${company.name}`];

  if (company.description) {
    details.push(`Description: ${company.description}`);
  }

  details.push(`\nPeople (${company.people.length}):`);

  company.people.forEach((person) => {
    details.push(`- ${person.name}${person.job_title ? ` (${person.job_title})` : ""} - ${person.email}`);
  });

  return details.join("\n");
}
