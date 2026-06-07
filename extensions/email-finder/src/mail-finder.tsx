import { Action, ActionPanel, Detail, Form, Icon, LaunchProps, showToast, Toast, useNavigation } from "@raycast/api";
import { getFavicon } from "@raycast/utils";
import { useState, useEffect, useRef } from "react";
import { addSearchHistoryEntry } from "./history-storage";
import { AuthGate } from "./auth";
import { mapEnrichResponseToData } from "./backend";
import { enrichPerson, type EnrichPersonResponse } from "./api/mail-finder-client";
import { fetchCredits, formatCredits } from "./credits";
import { CompanySearch } from "./company-search";
import { getErrorMessage } from "./utils";
import type { EnrichedData, JobHistory } from "./types";

export type { EnrichedData };

// * Markdown image helpers, get logos for companies from Prospeo's S3 bucket
const COMPANY_LOGO_BASE = "https://prospeo-static-assets.s3.us-east-1.amazonaws.com/company_logo/";

function resolveLogoUrl(logo: string | undefined | null): string | undefined {
  if (!logo) return undefined;
  if (logo.startsWith("http://") || logo.startsWith("https://")) return logo;
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

export default function Command(props: LaunchProps<{ arguments: Arguments.MailFinder }>) {
  return <AuthGate>{(signOut) => <MailFinderEntry signOut={signOut} arguments={props.arguments} />}</AuthGate>;
}

// * Entry point - decides which view to show based on arguments
function MailFinderEntry({
  signOut,
  arguments: args,
}: {
  signOut: () => Promise<void>;
  arguments: Arguments.MailFinder;
}) {
  const { firstName: argFirstName, lastName: argLastName, domain: argDomain } = args;

  if (argDomain) {
    return (
      <MailFinderFormView
        signOut={signOut}
        initialDomain={argDomain}
        initialFirstName={argFirstName}
        initialLastName={argLastName}
      />
    );
  }

  return (
    <CompanySearch
      signOut={signOut}
      renderSelectAction={(company) => (
        <Action.Push
          title="Select Company"
          icon={Icon.Check}
          target={<MailFinderFormView signOut={signOut} initialDomain={company.domain} />}
        />
      )}
      renderManualAction={() => (
        <Action.Push
          title="Enter Domain Manually"
          icon={Icon.Pencil}
          target={<MailFinderFormView signOut={signOut} />}
        />
      )}
    />
  );
}

// * Mail Finder Form View - standalone form component
export function MailFinderFormView({
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

  useEffect(() => {
    let cancelled = false;
    fetchCredits()
      .then((c) => {
        if (!cancelled) setCredits(c);
      })
      .catch((err) => {
        if (!cancelled) {
          console.error("Failed to fetch credits:", err);
          setCredits(-1);
        }
      });
    return () => {
      cancelled = true;
    };
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
    if (hasAutoSubmittedRef.current) return;
    if (hasAllArguments) {
      hasAutoSubmittedRef.current = true;
      handleSubmit({ firstName: initialFirstName, lastName: initialLastName, domain: initialDomain });
    }
  }, [hasAllArguments]);

  async function handleSubmit(values: { firstName: string; lastName: string; domain: string }) {
    const { firstName, lastName, domain } = values;

    if (!firstName.trim() || !lastName.trim() || !domain.trim()) {
      setError("First name, last name, and domain are all required.");
      return;
    }

    setIsLoading(true);
    setError(undefined);

    showToast({ style: Toast.Style.Animated, title: "Searching...", message: `Looking for ${firstName} ${lastName}` });

    try {
      const response: EnrichPersonResponse = await enrichPerson(firstName, lastName, domain);

      if (typeof response.balance === "number") {
        setCredits(response.balance);
      }

      const enrichedData = mapEnrichResponseToData(response, domain);
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

      push(
        <ResultsView
          data={enrichedData}
          isLoading={false}
          error={undefined}
          searchParams={{ firstName, lastName, domain }}
          signOut={signOut}
        />,
      );
    } catch (err) {
      const message = getErrorMessage(err);
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
  signOut,
}: {
  data: EnrichedData | undefined;
  isLoading: boolean;
  error: string | undefined;
  searchParams: { firstName: string; lastName: string; domain: string };
  onBack?: () => void;
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

    const verifiedText = person.email.status === "VERIFIED" ? " ( Email is Verified )" : " ( Email is not Verified )";

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
            <Action title="Close" icon={Icon.ArrowLeft} onAction={onBack} shortcut={{ modifiers: ["cmd"], key: "b" }} />
          )}
          {signOut && <Action title="Sign out" icon={Icon.Logout} onAction={signOut} />}
        </ActionPanel>
      }
    />
  );
}
