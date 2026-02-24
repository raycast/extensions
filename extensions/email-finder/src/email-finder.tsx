import { Action, ActionPanel, Detail, Form, Icon, LaunchProps, showToast, Toast, useNavigation } from "@raycast/api";
import { getFavicon } from "@raycast/utils";
import { useState, useEffect, useRef } from "react";
import { addSearchHistoryEntry } from "./history-storage";
import { AuthGate } from "./auth";
import { enrichPerson, EnrichPersonResponse } from "./backend";
import { fetchCredits, formatCredits } from "./credits";
import { EmailFinderCompanySearch } from "./company-search";

// * Types
interface JobHistory {
  title: string;
  company_name: string;
  current: boolean;
  start_year: number;
  start_month: number;
  end_year: number | null;
  end_month: number | null;
  seniority: string;
  logo_url?: string | null;
  duration_in_months?: number;
  departments?: string[];
}

interface PersonLocation {
  country: string;
  city: string;
  state?: string;
  country_code?: string;
}

interface PersonData {
  first_name: string;
  last_name: string;
  full_name: string;
  headline: string | null;
  linkedin_url: string | null;
  job_history: JobHistory[];
  mobile: {
    status: string;
    mobile_international: string | null;
    mobile_country?: string;
  } | null;
  email: {
    status: string;
    email: string;
    email_mx_provider?: string;
  };
  location: PersonLocation | null;
  current_job_title?: string;
}

interface FundingEvent {
  amount: number;
  amount_printed: string;
  raised_at: string;
  stage: string;
  link: string;
}

interface Funding {
  total_funding_printed: string;
  latest_funding_stage: string;
  latest_funding_date: string;
  funding_events?: FundingEvent[];
}

interface CompanyData {
  name: string;
  website: string;
  domain: string;
  type: string | null;
  industry: string;
  description_ai: string | null;
  employee_range: string;
  founded: number;
  linkedin_url: string | null;
  twitter_url: string | null;
  logo_url: string | null;
  location: {
    country: string;
    city: string;
    raw_address?: string;
  } | null;
  revenue_range_printed: string | null;
  funding: Funding | null;
  employee_count?: number;
  keywords?: string[];
}

export interface EnrichedData {
  person: PersonData;
  company: CompanyData;
}

// * Markdown image helpers
const COMPANY_LOGO_BASE = "https://prospeo-static-assets.s3.us-east-1.amazonaws.com/company_logo/";

function resolveLogoUrl(logo: string | undefined | null): string | undefined {
  if (!logo) return undefined;
  // If already a full URL, return as-is
  if (logo.startsWith("http://") || logo.startsWith("https://")) return logo;
  // Otherwise, it's a filename - prefix with S3 base
  return `${COMPANY_LOGO_BASE}${logo}`;
}

function withRaycastImageSize(url: string, w: number, h: number): string {
  const separator = url.includes("?") ? "&" : "?";
  return `${url}${separator}raycast-width=${w}&raycast-height=${h}`;
}

function formatMonthYear(year: number, month: number): string {
  if (!year || year === 0) return "";
  const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  if (month && month >= 1 && month <= 12) {
    return `${monthNames[month - 1]} ${year}`;
  }
  return String(year);
}

function formatJobPeriod(job: JobHistory): string {
  const start = formatMonthYear(job.start_year, job.start_month);
  if (job.current) return `${start} - Present`;
  const end = formatMonthYear(job.end_year ?? 0, job.end_month ?? 0);
  return end ? `${start} - ${end}` : start;
}

// * Map backend response to EnrichedData
function mapResponseToEnrichedData(response: EnrichPersonResponse, domain: string): EnrichedData | null {
  if (!response.person?.email?.email) return null;

  return {
    person: {
      first_name: response.person.first_name,
      last_name: response.person.last_name,
      full_name: response.person.full_name,
      headline: response.person.headline || null,
      linkedin_url: response.person.linkedin_url || null,
      current_job_title: response.person.current_job_title || undefined,
      job_history: (response.person.job_history || []) as JobHistory[],
      mobile: response.person.mobile
        ? {
            status: response.person.mobile.status,
            mobile_international: response.person.mobile.mobile_international || null,
            mobile_country: response.person.mobile.mobile_country,
          }
        : null,
      email: {
        status: response.person.email.status,
        email: response.person.email.email,
        email_mx_provider: response.person.email.email_mx_provider,
      },
      location: response.person.location
        ? {
            country: response.person.location.country,
            city: response.person.location.city,
            state: response.person.location.state,
            country_code: response.person.location.country_code,
          }
        : null,
    },
    company: {
      name: response.company?.name || domain,
      website: response.company?.website || `https://${domain}`,
      domain: response.company?.domain || domain,
      type: response.company?.type || null,
      industry: response.company?.industry || "",
      description_ai: response.company?.description_ai || null,
      employee_range: response.company?.employee_range || "",
      employee_count: response.company?.employee_count,
      founded: response.company?.founded || 0,
      linkedin_url: response.company?.linkedin_url || null,
      twitter_url: response.company?.twitter_url || null,
      logo_url: response.company?.logo_url || null,
      location: response.company?.location
        ? {
            country: response.company.location.country,
            city: response.company.location.city,
            raw_address: response.company.location.raw_address,
          }
        : null,
      revenue_range_printed: response.company?.revenue_range_printed || null,
      funding: response.company?.funding
        ? {
            total_funding_printed: response.company.funding.total_funding_printed,
            latest_funding_stage: response.company.funding.latest_funding_stage,
            latest_funding_date: response.company.funding.latest_funding_date,
            funding_events: response.company.funding.funding_events,
          }
        : null,
      keywords: response.company?.keywords,
    },
  };
}

interface Arguments {
  firstName?: string;
  lastName?: string;
  domain?: string;
}

export default function Command(props: LaunchProps<{ arguments: Arguments }>) {
  return <AuthGate>{(signOut) => <EmailFinderEntry signOut={signOut} arguments={props.arguments} />}</AuthGate>;
}

// * Entry point - decides which view to show based on arguments
function EmailFinderEntry({ signOut, arguments: args }: { signOut: () => Promise<void>; arguments: Arguments }) {
  const { firstName: argFirstName, lastName: argLastName, domain: argDomain } = args;

  // * If domain is provided, go directly to form
  if (argDomain) {
    return (
      <EmailFormView
        signOut={signOut}
        initialDomain={argDomain}
        initialFirstName={argFirstName}
        initialLastName={argLastName}
      />
    );
  }

  // * Otherwise, show company search which uses Action.Push to navigate to form
  return <EmailFinderCompanySearch signOut={signOut} />;
}

// * Email Form View - standalone form component
export function EmailFormView({
  signOut,
  initialDomain = "",
  initialFirstName = "",
  initialLastName = "",
}: {
  signOut: () => Promise<void>;
  initialDomain?: string;
  initialFirstName?: string;
  initialLastName?: string;
}) {
  const { push } = useNavigation();
  const [credits, setCredits] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | undefined>(undefined);

  // * Fetch credits on mount
  useEffect(() => {
    fetchCredits()
      .then(setCredits)
      .catch((err) => {
        console.error("Failed to fetch credits:", err);
        setCredits(-1);
      });
  }, []);

  // * Determine which field to auto-focus (first empty one)
  const autoFocusField = !initialFirstName
    ? "firstName"
    : !initialLastName
      ? "lastName"
      : !initialDomain
        ? "domain"
        : "firstName";

  // * Auto-submit if all arguments provided
  const hasAllArguments = initialFirstName && initialLastName && initialDomain;
  const hasAutoSubmittedRef = useRef(false);

  useEffect(() => {
    // Prevent duplicate requests from React Strict Mode double-mounting
    if (hasAutoSubmittedRef.current) return;
    if (hasAllArguments) {
      hasAutoSubmittedRef.current = true;
      handleSubmit({ firstName: initialFirstName, lastName: initialLastName, domain: initialDomain });
    }
  }, [hasAllArguments]);

  async function handleSubmit(values: { firstName: string; lastName: string; domain: string }) {
    const { firstName, lastName, domain } = values;
    setIsLoading(true);
    setError(undefined);

    showToast({ style: Toast.Style.Animated, title: "Searching...", message: `Looking for ${firstName} ${lastName}` });

    try {
      const response = await enrichPerson(firstName, lastName, domain);

      if (typeof response.balance === "number") {
        setCredits(response.balance);
      }

      const enrichedData = mapResponseToEnrichedData(response, domain);
      if (!enrichedData) {
        throw new Error("No email found for this person");
      }

      showToast({ style: Toast.Style.Success, title: "Found", message: enrichedData.person.email.email });
      await addSearchHistoryEntry({
        firstName,
        lastName,
        domain,
        status: "success",
        email: enrichedData.person.email.email,
        enrichedData,
      });

      // * Push results view using Navigation API
      push(
        <ResultsView
          data={enrichedData}
          isLoading={false}
          error={undefined}
          searchParams={{ firstName, lastName, domain }}
          credits={credits}
          signOut={signOut}
        />,
      );
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      setError(message);
      showToast({ style: Toast.Style.Failure, title: "Failed", message });
      await addSearchHistoryEntry({
        firstName,
        lastName,
        domain,
        status: "error",
        error: message,
      });
      fetchCredits()
        .then(setCredits)
        .catch(() => {});
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Form
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Find Email"
            onSubmit={(values) => handleSubmit(values as { firstName: string; lastName: string; domain: string })}
          />
          <Action title="Sign out" icon={Icon.Logout} onAction={signOut} />
        </ActionPanel>
      }
    >
      <Form.Description
        title="Credits"
        text={credits === null ? "Loading..." : credits === -1 ? "Error loading credits" : formatCredits(credits)}
      />
      <Form.Separator />
      <Form.TextField
        id="firstName"
        title="First Name"
        placeholder="first"
        defaultValue={initialFirstName}
        autoFocus={autoFocusField === "firstName"}
      />
      <Form.TextField
        id="lastName"
        title="Last Name"
        placeholder="lastname"
        defaultValue={initialLastName}
        autoFocus={autoFocusField === "lastName"}
      />
      <Form.TextField
        id="domain"
        title="Domain"
        placeholder="acme.com"
        defaultValue={initialDomain}
        autoFocus={autoFocusField === "domain"}
      />
      {error && (
        <>
          <Form.Separator />
          <Form.Description title="Error" text={error} />
        </>
      )}
    </Form>
  );
}

// * Results View
export function ResultsView({
  data,
  isLoading,
  error,
  searchParams,
  onBack,
  credits,
  signOut,
}: {
  data: EnrichedData | undefined;
  isLoading: boolean;
  error: string | undefined;
  searchParams: { firstName: string; lastName: string; domain: string };
  onBack?: () => void;
  credits?: number | null;
  signOut?: () => Promise<void>;
}) {
  const fullName = `${searchParams.firstName} ${searchParams.lastName}`;

  function buildMarkdown(): string {
    if (isLoading) return `# Searching...\n\nLooking for **${fullName}** at **${searchParams.domain}**`;
    if (error) return `# Error\n\n${error}`;
    if (!data) return "# No Results";

    const { person } = data;
    const linkedInIcon = "https://cdn-icons-png.flaticon.com/512/174/174857.png";
    let md = "";

    // * Header: Email + Verified badge
    const verifiedText = person.email.status === "VERIFIED" ? " ( Email is Verified )" : " ( Email is not Verified )";

    // * Person info
    md += `## ${person.full_name}\n\n`;
    if (person.headline) md += `${person.headline}\n\n`;

    if (person.location) {
      md += `${person.location.city}, ${person.location.country}\n`;
    }
    if (person.linkedin_url) {
      const linkedInImg = withRaycastImageSize(linkedInIcon, 16, 16);
      md += `![LinkedIn](${linkedInImg}) [LinkedIn Profile](${person.linkedin_url})\n`;
    }
    md += `#### Email: ${person.email.email}${verifiedText}\n\n`;
    md += `\n`;

    md += `---\n\n`;

    // * Experience section (top 6)
    if (person.job_history.length > 0) {
      md += `### Experience\n\n`;
      person.job_history.slice(0, 6).forEach((job) => {
        const logoUrl = resolveLogoUrl(job.logo_url);
        const logoImg = logoUrl ? `![](${withRaycastImageSize(logoUrl, 20, 20)}) ` : "";
        const period = formatJobPeriod(job);
        md += `- ${logoImg}**${job.title}** at ${job.company_name}, ${period}\n`;
      });
      md += `\n`;
    }

    return md;
  }

  return (
    <Detail
      isLoading={isLoading}
      markdown={buildMarkdown()}
      metadata={
        !isLoading && data ? (
          <Detail.Metadata>
            {/* Credits */}
            {credits !== null && credits !== undefined && (
              <>
                <Detail.Metadata.Label title="Credits Remaining" text={formatCredits(credits)} icon={Icon.Coins} />
                <Detail.Metadata.Separator />
              </>
            )}
            {/* Company */}
            <Detail.Metadata.Label title="Company" text={data.company.name} icon={getFavicon(data.company.website)} />
            {(data.company.type || data.company.industry) && (
              <Detail.Metadata.Label
                title="Type / Industry"
                text={[data.company.type, data.company.industry].filter(Boolean).join(" · ")}
              />
            )}
            {data.company.location && (
              <Detail.Metadata.Label
                title="HQ"
                text={`${data.company.location.city}, ${data.company.location.country}`}
              />
            )}
            {data.company.employee_range && (
              <Detail.Metadata.Label title="Employees" text={data.company.employee_range} />
            )}
            {data.company.founded > 0 && <Detail.Metadata.Label title="Founded" text={String(data.company.founded)} />}
            {data.company.revenue_range_printed && (
              <Detail.Metadata.Label title="Revenue" text={data.company.revenue_range_printed} />
            )}
            {data.company.funding &&
              (() => {
                const fundingEvents = data.company.funding.funding_events ?? [];
                const latestRounds = [...fundingEvents]
                  .sort((a, b) => b.raised_at.localeCompare(a.raised_at))
                  .slice(0, 3);

                if (latestRounds.length === 0) {
                  return (
                    <Detail.Metadata.Label
                      title="Funding"
                      text={`${data.company.funding.latest_funding_stage} · ${data.company.funding.latest_funding_date.split("T")[0]}`}
                    />
                  );
                }

                return latestRounds.map((event, idx) => (
                  <Detail.Metadata.Label
                    key={idx}
                    title={idx === 0 ? "Funding" : ""}
                    text={`${event.amount_printed} · ${event.stage} · ${event.raised_at.split("T")[0]}`}
                  />
                ));
              })()}
            {data.company.description_ai && <Detail.Metadata.Label title="About" text={data.company.description_ai} />}

            <Detail.Metadata.Separator />
          </Detail.Metadata>
        ) : undefined
      }
      actions={
        <ActionPanel>
          {data && (
            <>
              <Action.CopyToClipboard title="Copy Email" content={data.person.email.email} />
              {data.person.linkedin_url && (
                <Action.CopyToClipboard
                  title="Copy LinkedIn URL"
                  content={data.person.linkedin_url}
                  shortcut={{ modifiers: ["cmd"], key: "l" }}
                />
              )}
            </>
          )}
          {onBack && (
            <Action title="Close" icon={Icon.ArrowLeft} onAction={onBack} shortcut={{ modifiers: ["cmd"], key: "w" }} />
          )}
          {signOut && <Action title="Sign out" icon={Icon.Logout} onAction={signOut} />}
        </ActionPanel>
      }
    />
  );
}
