import { Action, ActionPanel, Color, Detail, Icon, List, Keyboard } from "@raycast/api";
import { useMemo, useState } from "react";
import { getDefaultCatalog } from "venue-rank";
import type { AssessmentResult, RankingSource, Venue } from "venue-rank";

interface VenueViewProps {
  venue: Venue;
  assessments: AssessmentResult[];
  version: string;
}

const venueStyles = {
  conference: { name: "Conference", icon: { source: Icon.TwoPeople, tintColor: Color.Blue } },
  journal: { name: "Journal", icon: { source: Icon.Book, tintColor: Color.Purple } },
};

function assessmentColor(value: string | undefined): Color {
  // Only explicit grades receive a color. Other publisher labels retain a neutral appearance.
  switch (value) {
    case "A*":
      return Color.Yellow;
    case "A":
      return Color.Green;
    case "B":
      return Color.Blue;
    case "C":
      return Color.Purple;
    default:
      return Color.SecondaryText;
  }
}

function assessmentLabel(result: AssessmentResult): string {
  if (result.status === "assessed") return result.assessments.map((a) => a.value).join(" / ");
  return { "not-listed": "Not listed", unknown: "Not verified", "not-applicable": "Not applicable" }[result.status];
}

function sourceName(source: RankingSource): string {
  return source.name === "CORE / ICORE" ? "ICORE" : source.name;
}

function sourceTitle(source: RankingSource): string {
  return `${sourceName(source)} ${source.edition.replace(/^ICORE/, "")}`;
}

function escapeMarkdown(value: string): string {
  return value.replace(/[\\`*_{}[\]()#+.!|<>]/g, "\\$&");
}

function venueSummary(venue: Venue): string {
  const title = escapeMarkdown(venue.acronym || venue.name);
  return venue.acronym ? `# ${title}\n\n${escapeMarkdown(venue.name)}` : `# ${title}`;
}

function referenceText({ venue, assessments, version }: VenueViewProps): string {
  const name = venue.acronym ? `${venue.acronym}\n${venue.name}` : venue.name;
  return (
    `${name}\n\n` +
    assessments.map((result) => `${sourceTitle(result.source)}: ${assessmentLabel(result)}`).join("\n") +
    `\n\nDataset: ${version}`
  );
}

function VenueMetadata({ venue, assessments, version }: VenueViewProps) {
  const style = venueStyles[venue.type];
  return (
    <Detail.Metadata>
      <Detail.Metadata.Label title="Type" text={style.name} icon={style.icon} />
      <Detail.Metadata.Separator />
      {assessments.map((result) =>
        result.status === "assessed" ? (
          <Detail.Metadata.TagList key={result.source.id} title={sourceTitle(result.source)}>
            {result.assessments.map((assessment, index) => (
              <Detail.Metadata.TagList.Item
                key={`${assessment.area ?? ""}-${index}`}
                text={assessment.value}
                color={assessmentColor(assessment.value)}
              />
            ))}
          </Detail.Metadata.TagList>
        ) : (
          <Detail.Metadata.Label
            key={result.source.id}
            title={sourceTitle(result.source)}
            text={{ value: assessmentLabel(result), color: Color.SecondaryText }}
            icon={{
              source: result.status === "unknown" ? Icon.QuestionMarkCircle : Icon.MinusCircle,
              tintColor: Color.SecondaryText,
            }}
          />
        ),
      )}
      <Detail.Metadata.Separator />
      {venue.dblp && <Detail.Metadata.Link title="DBLP" target={venue.dblp} text="Open venue" />}
      <Detail.Metadata.Label
        title="Dataset"
        text={{ value: version, color: Color.SecondaryText }}
        icon={{ source: Icon.Calendar, tintColor: Color.SecondaryText }}
      />
    </Detail.Metadata>
  );
}

function SourceNotes({ venue, assessments, version }: VenueViewProps) {
  const markdown =
    `## Data & sources\n\n${escapeMarkdown(venue.acronym || venue.name)} uses dataset ${escapeMarkdown(version)}. Each list keeps its own assessment scale.\n\n` +
    assessments
      .map((result) => {
        const record = result.assessments[0]?.url ?? result.source.publisherUrl;
        return `### ${escapeMarkdown(sourceTitle(result.source))}\n\n**${escapeMarkdown(assessmentLabel(result))}**\n\n${escapeMarkdown(result.source.note)}\n\n[View record](${record}) · [Data snapshot](${result.source.dataUrl})`;
      })
      .join("\n\n");
  return <Detail navigationTitle="Data & Sources" markdown={markdown} />;
}

function VenueActions(
  props: VenueViewProps & { showDetails?: boolean; showingPreview?: boolean; onTogglePreview?: () => void },
) {
  const { venue, assessments, version } = props;
  const context = { venue, assessments, version };
  return (
    <ActionPanel>
      <ActionPanel.Section title="Venue">
        {props.showDetails && (
          <Action.Push
            title="View Details"
            icon={{ source: Icon.Sidebar, tintColor: Color.Blue }}
            target={<VenueDetails {...context} />}
          />
        )}
        <Action.CopyToClipboard
          title="Copy Assessments"
          content={referenceText(context)}
          shortcut={Keyboard.Shortcut.Common.Copy}
        />
        {props.onTogglePreview && (
          <Action
            title={props.showingPreview ? "Hide Preview" : "Show Preview"}
            icon={Icon.Sidebar}
            shortcut={{ modifiers: ["cmd"], key: "d" }}
            onAction={props.onTogglePreview}
          />
        )}
      </ActionPanel.Section>
      <ActionPanel.Section title="Sources">
        {venue.dblp && <Action.OpenInBrowser title="Open in DBLP" url={venue.dblp} />}
        <ActionPanel.Submenu title="Open Source" icon={{ source: Icon.Link, tintColor: Color.Purple }}>
          {assessments.map((result) => (
            <Action.OpenInBrowser
              key={result.source.id}
              title={sourceTitle(result.source)}
              url={result.assessments[0]?.url ?? result.source.publisherUrl}
            />
          ))}
        </ActionPanel.Submenu>
        <Action.Push
          title="Data & Sources"
          icon={{ source: Icon.Info, tintColor: Color.Blue }}
          shortcut={{ modifiers: ["cmd"], key: "i" }}
          target={<SourceNotes {...context} />}
        />
      </ActionPanel.Section>
    </ActionPanel>
  );
}

function VenueDetails(props: VenueViewProps) {
  return (
    <Detail
      navigationTitle={props.venue.acronym || props.venue.name}
      markdown={venueSummary(props.venue)}
      metadata={<VenueMetadata {...props} />}
      actions={<VenueActions {...props} />}
    />
  );
}

export default function SearchVenues() {
  const catalog = useMemo(() => getDefaultCatalog(), []);
  const [query, setQuery] = useState("");
  const [type, setType] = useState("all");
  const [showingPreview, setShowingPreview] = useState(false);
  const results = catalog.search(query, { limit: 100, ...(type === "all" ? {} : { type: type as Venue["type"] }) });
  const totalVenues = catalog.dataset.venues.filter((venue) => type === "all" || venue.type === type).length;
  const sectionTitle = query.trim()
    ? "Search Results"
    : type === "all"
      ? "All Venues"
      : type === "conference"
        ? "Conferences"
        : "Journals";
  const sectionSubtitle = query.trim()
    ? `Showing ${results.length} ${results.length === 1 ? "match" : "matches"}`
    : `Showing ${results.length} of ${totalVenues.toLocaleString("en-US")}`;
  return (
    <List
      filtering={false}
      isShowingDetail={showingPreview}
      searchText={query}
      onSearchTextChange={setQuery}
      searchBarPlaceholder="Search by acronym, name, or alias…"
      searchBarAccessory={
        <List.Dropdown tooltip="Venue type" value={type} onChange={setType}>
          <List.Dropdown.Item
            title="All Venues"
            value="all"
            icon={{ source: Icon.AppWindowGrid3x3, tintColor: Color.SecondaryText }}
          />
          <List.Dropdown.Item title="Conferences" value="conference" icon={venueStyles.conference.icon} />
          <List.Dropdown.Item title="Journals" value="journal" icon={venueStyles.journal.icon} />
        </List.Dropdown>
      }
    >
      <List.EmptyView
        icon={{ source: Icon.MagnifyingGlass, tintColor: Color.Blue }}
        title="No Matching Venues"
        description="Try an acronym such as SIGCOMM or TKDE, or change the venue filter."
      />
      <List.Section title={sectionTitle} subtitle={sectionSubtitle}>
        {results.map(({ venue }) => {
          const assessments = catalog.getAssessments(venue.id);
          const props = { venue, assessments, version: catalog.dataset.version };
          const subtitle =
            !showingPreview && venue.acronym ? { subtitle: { value: venue.name, tooltip: venue.name } } : {};
          return (
            <List.Item
              key={venue.id}
              id={venue.id}
              title={{ value: venue.acronym || venue.name, tooltip: venue.name }}
              {...subtitle}
              icon={venueStyles[venue.type].icon}
              accessories={
                showingPreview
                  ? []
                  : assessments
                      .filter((result) => result.status === "assessed")
                      .map((result) => ({
                        tag: {
                          value: `${sourceName(result.source)} ${assessmentLabel(result)}`,
                          color:
                            result.assessments.length === 1
                              ? assessmentColor(result.assessments[0]?.value)
                              : Color.SecondaryText,
                        },
                        tooltip: `${sourceTitle(result.source)}: ${assessmentLabel(result)}. Each list uses its own scale.`,
                      }))
              }
              detail={<List.Item.Detail markdown={venueSummary(venue)} metadata={<VenueMetadata {...props} />} />}
              actions={
                <VenueActions
                  {...props}
                  showDetails
                  showingPreview={showingPreview}
                  onTogglePreview={() => setShowingPreview((value) => !value)}
                />
              }
            />
          );
        })}
      </List.Section>
    </List>
  );
}
