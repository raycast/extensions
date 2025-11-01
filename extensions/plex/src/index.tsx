import { ActionPanel, List, Action, Icon } from "@raycast/api";
import { useFetch } from "@raycast/utils";
import { ENDPOINTS, SECTION_ICONS, plex_token } from "../utils/constants";
import { SectionsApiResponse } from "../types/types";
import { GetSectionItems } from "./sectionItems";

export default function Command() {
  const { data, isLoading } = useFetch(ENDPOINTS.librarySections, {
    headers: { "X-Plex-Token": plex_token, Accept: "application/json" },
    parseResponse,
    initialData: [],
    keepPreviousData: true,
  });

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search..." throttle>
      <List.Section title="Plex Library Sections" subtitle={data.length + ""}>
        {data.map((section) => (
          <PlexLibrarySection key={section.title} plexLibrary={section} />
        ))}
      </List.Section>
    </List>
  );
}

function PlexLibrarySection({ plexLibrary }: { plexLibrary: SectionsApiResponse["MediaContainer"]["Directory"][0] }) {
  return (
    <List.Item
      icon={
        plexLibrary.agent.includes("movie")
          ? SECTION_ICONS.movie
          : plexLibrary.agent.includes("serie")
            ? SECTION_ICONS.show
            : plexLibrary.agent.includes("music")
              ? SECTION_ICONS.music
              : plexLibrary.agent.includes("photos")
                ? SECTION_ICONS.photo
                : SECTION_ICONS.other
      }
      title={plexLibrary.title}
      accessories={[{ icon: Icon.SpeechBubble, text: plexLibrary.language }]}
      actions={
        <ActionPanel>
          <Action.Push
            icon={Icon.AppWindowGrid3x3}
            title="View Library Items"
            target={<GetSectionItems sectionId={plexLibrary.key} sectionName={plexLibrary.title} />}
          />
        </ActionPanel>
      }
    />
  );
}

async function parseResponse(response: Response): Promise<SectionsApiResponse["MediaContainer"]["Directory"]> {
  const json = (await response.json()) as SectionsApiResponse;

  if (!response.ok || !json.MediaContainer || !json.MediaContainer.Directory) {
    throw new Error("Error in response");
  }

  return json.MediaContainer.Directory;
}
