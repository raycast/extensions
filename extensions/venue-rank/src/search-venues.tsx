import { Action, ActionPanel, Color, Detail, Icon, List, Keyboard } from "@raycast/api";
import { useMemo, useState } from "react";
import { getDefaultCatalog } from "./catalog";
import type { AssessmentResult, RankingSource, Venue } from "./catalog";

interface VenueViewProps {
  venue: Venue;
  assessments: AssessmentResult[];
  version: string;
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
  return venue.acronym ? `## ${title}\n\n${escapeMarkdown(venue.name)}` : `## ${title}`;
}

function referenceText({ venue, assessments, version }: VenueViewProps): string {
  const name = venue.acronym ? `${venue.acronym}\n${venue.name}` : venue.name;
  return (
    `${name}\n\n` +
    assessments.map((result) => `${sourceTitle(result.source)}: ${assessmentLabel(result)}`).join("\n") +
    `\n\nDataset: ${version}`
  );
}

function VenueMetadata({ venue, assessments }: Pick<VenueViewProps, "venue" | "assessments">) {
  return (
    <Detail.Metadata>
      {assessments.map((result) =>
        result.status === "assessed" ? (
          <Detail.Metadata.TagList key={result.source.id} title={sourceTitle(result.source)}>
            {result.assessments.map((assessment, index) => (
              <Detail.Metadata.TagList.Item
                key={`${assessment.area ?? ""}-${index}`}
                text={assessment.value}
                color={Color.SecondaryText}
              />
            ))}
          </Detail.Metadata.TagList>
        ) : (
          <Detail.Metadata.Label
            key={result.source.id}
            title={sourceTitle(result.source)}
            text={{ value: assessmentLabel(result), color: Color.SecondaryText }}
          />
        ),
      )}
      <Detail.Metadata.Separator />
      <Detail.Metadata.Label title="Type" text={venue.type === "conference" ? "Conference" : "Journal"} />
      {venue.dblp && <Detail.Metadata.Link title="DBLP" target={venue.dblp} text="Open venue" />}
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
      <ActionPanel.Section>
        {props.showDetails && (
          <Action.Push title="View Details" icon={Icon.Sidebar} target={<VenueDetails {...context} />} />
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
      <ActionPanel.Section>
        {venue.dblp && <Action.OpenInBrowser title="Open in DBLP" url={venue.dblp} />}
        <ActionPanel.Submenu title="Open Source" icon={Icon.Link}>
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
          icon={Icon.Info}
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
  return (
    <List
      filtering={false}
      isShowingDetail={showingPreview}
      searchText={query}
      onSearchTextChange={setQuery}
      searchBarPlaceholder="Search venues…"
      searchBarAccessory={
        <List.Dropdown tooltip="Venue type" value={type} onChange={setType}>
          <List.Dropdown.Item title="All Venues" value="all" />
          <List.Dropdown.Item title="Conferences" value="conference" />
          <List.Dropdown.Item title="Journals" value="journal" />
        </List.Dropdown>
      }
    >
      <List.EmptyView
        icon={Icon.MagnifyingGlass}
        title="No Matching Venues"
        description="Try another name or change the venue filter."
      />
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
            icon={{ source: venue.type === "journal" ? Icon.Book : Icon.Document, tintColor: Color.SecondaryText }}
            accessories={
              showingPreview
                ? []
                : assessments
                    .filter((result) => result.status === "assessed")
                    .map((result) => ({
                      text: `${sourceName(result.source)} ${assessmentLabel(result)}`,
                      tooltip: `${sourceTitle(result.source)}: ${assessmentLabel(result)}`,
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
    </List>
  );
}
