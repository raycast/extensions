import { List, Action, ActionPanel, Icon, Color } from "@raycast/api";
import { useState, useMemo, useEffect } from "react";
import { usePeople } from "./utils/usePeople";
import { Company, Document, Doc } from "./utils/types";
import Unresponsive from "./templates/unresponsive";
import { getDocumentsByIds } from "./utils/fetchData";
import { NoteListItem } from "./components/NoteComponents";
import { useFavicon } from "./utils/toolHelpers";
import { formatCompanyMeetingDate, sortCompanies, type CompanySortOption } from "./utils/searchUtils";

export default function Command() {
  const { companies, isLoading, hasError } = usePeople();
  const [sortBy, setSortBy] = useState<CompanySortOption>("meeting-count");

  const sortedCompanies = useMemo(() => sortCompanies(companies, sortBy), [companies, sortBy]);

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
    let cancelled = false;

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
          if (!cancelled) {
            setMeetings([]);
            setIsLoading(false);
          }
          return;
        }

        const documents = await getDocumentsByIds(Array.from(meetingIds));
        if (cancelled) return;
        const meetingsList = documents.filter((document) => meetingIds.has(document.id));

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
  }, [company]);

  return { meetings, isLoading };
}

function CompanyMeetingsList({ company }: { company: Company }) {
  const { meetings, isLoading: meetingsLoading } = useCompanyMeetings(company);

  // Panels are loaded on-demand in NoteListItem when details are viewed

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
        meetings.map((meeting) => <NoteListItem key={meeting.id} doc={meeting as Doc} />)
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

  const displayTitle = company.name;
  const isDomainCompany = company.name.includes(".") && !company.name.includes(" ");

  if (isDomainCompany && !subtitle) {
    subtitle = company.name;
  }

  const accessories: List.Item.Accessory[] = [];

  // Add last meeting date first (to match Granola app order)
  if (company.lastMeetingDate) {
    accessories.push({
      text: formatCompanyMeetingDate(company.lastMeetingDate),
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
