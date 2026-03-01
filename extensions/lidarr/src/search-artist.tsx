import { Action, ActionPanel, Form, Icon, List } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { useCallback, useEffect, useMemo, useState } from "react";
import ArtistDetail from "@/lib/components/ArtistDetail";
import {
  addArtist,
  getMetadataProfiles,
  getQualityProfiles,
  getRootFolders,
  searchArtist,
  useArtists,
} from "@/lib/hooks/useLidarrAPI";
import type { AddArtistOptions, Artist, ArtistLookup } from "@/lib/types/lidarr";
import { formatOverview, getPoster, normalizeImageUrl } from "@/lib/utils/formatting";

export default function Command() {
  const [searchText, setSearchText] = useState("");
  const [results, setResults] = useState<ArtistLookup[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { data: artists = [], mutate } = useArtists();

  const existingArtistsByForeignId = useMemo(
    () =>
      new Map(
        artists
          .filter((artist) => artist.foreignArtistId)
          .map((artist) => [artist.foreignArtistId as string, artist]),
      ),
    [artists],
  );

  const handleSearch = useCallback(async (term: string) => {
    setSearchText(term);

    const query = term.trim();
    if (query.length < 2) {
      setResults([]);
      return;
    }

    setIsLoading(true);
    try {
      const found = await searchArtist(query);
      setResults(found);
    } finally {
      setIsLoading(false);
    }
  }, []);

  return (
    <List
      isLoading={isLoading}
      isShowingDetail
      filtering={false}
      searchBarPlaceholder="Search for artists..."
      onSearchTextChange={handleSearch}
      throttle
    >
      {results.length === 0 && searchText.trim().length > 1 && !isLoading && (
        <List.EmptyView title="No Results" description="No artist matched your search" icon={Icon.MagnifyingGlass} />
      )}

      <List.Section title="Search Results" subtitle={`${results.length}`}>
        {results.map((artist) => (
          <SearchArtistItem
            key={`${artist.foreignArtistId || artist.id}-${artist.artistName}`}
            artist={artist}
            existingArtist={artist.foreignArtistId ? existingArtistsByForeignId.get(artist.foreignArtistId) : undefined}
            onArtistAdded={mutate}
          />
        ))}
      </List.Section>
    </List>
  );
}

function SearchArtistItem({
  artist,
  existingArtist,
  onArtistAdded,
}: {
  artist: ArtistLookup;
  existingArtist?: Artist;
  onArtistAdded: () => void;
}) {
  const poster = getPoster(artist.images) || normalizeImageUrl(artist.remotePoster);
  const inLibrary = Boolean(existingArtist);

  const markdown = useMemo(() => {
    const sections: string[] = [];

    sections.push(`# ${artist.artistName}`);
    if (artist.genres?.length) sections.push(`**Genres:** ${artist.genres.join(", ")}`);
    sections.push("\n");
    sections.push(formatOverview(artist.overview));

    return sections.join("\n");
  }, [artist, poster]);

  return (
    <List.Item
      title={artist.artistName}
      subtitle={artist.sortName}
      icon={poster || Icon.Music}
      accessories={inLibrary ? [{ tag: "In Library" }] : []}
      detail={<List.Item.Detail markdown={markdown} />}
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            {existingArtist && (
              <Action.Push title="Open Artist" icon={Icon.ChevronRight} target={<ArtistDetail artist={existingArtist} />} />
            )}
            {!inLibrary && (
              <Action.Push
                title="Add Artist"
                icon={Icon.Plus}
                target={<AddArtistForm artist={artist} onDone={onArtistAdded} />}
              />
            )}
            <Action.CopyToClipboard title="Copy Artist Name" content={artist.artistName} />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}

function AddArtistForm({ artist, onDone }: { artist: ArtistLookup; onDone: () => void }) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [roots, setRoots] = useState<Array<{ title: string; value: string }>>([]);
  const [qualities, setQualities] = useState<Array<{ title: string; value: string }>>([]);
  const [metadataProfiles, setMetadataProfiles] = useState<Array<{ title: string; value: string }>>([]);

  useEffect(() => {
    (async () => {
      try {
        const [rootFolders, qualityProfiles, profiles] = await Promise.all([
          getRootFolders(),
          getQualityProfiles(),
          getMetadataProfiles(),
        ]);

        setRoots(rootFolders.map((r) => ({ title: r.path, value: r.path })));
        setQualities(qualityProfiles.map((p) => ({ title: p.name, value: String(p.id) })));
        setMetadataProfiles(profiles.map((p) => ({ title: p.name, value: String(p.id) })));
      } catch (error) {
        showFailureToast(error, { title: "Failed to load Lidarr profiles" });
      }
    })();
  }, []);

  const handleSubmit = async (values: {
    rootFolderPath: string;
    qualityProfileId: string;
    metadataProfileId: string;
    monitored: boolean;
    monitor: "all" | "future" | "missing" | "none";
    searchForMissingAlbums: boolean;
  }) => {
    setIsSubmitting(true);

    try {
      const payload: AddArtistOptions = {
        artistName: artist.artistName,
        foreignArtistId: artist.foreignArtistId,
        qualityProfileId: Number(values.qualityProfileId),
        metadataProfileId: Number(values.metadataProfileId),
        monitored: values.monitored,
        rootFolderPath: values.rootFolderPath,
        addOptions: {
          monitor: values.monitor,
          searchForMissingAlbums: values.searchForMissingAlbums,
        },
      };

      await addArtist(payload);
      onDone();
    } catch (error) {
      showFailureToast(error, { title: "Failed to add artist" });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Form
      isLoading={!roots.length || !qualities.length || !metadataProfiles.length}
      navigationTitle={`Add ${artist.artistName}`}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Add Artist" onSubmit={handleSubmit} icon={Icon.Plus} />
        </ActionPanel>
      }
    >
      <Form.Description title="Artist" text={artist.artistName} />
      <Form.Dropdown id="rootFolderPath" title="Root Folder" defaultValue={roots[0]?.value}>
        {roots.map((item) => (
          <Form.Dropdown.Item key={item.value} title={item.title} value={item.value} />
        ))}
      </Form.Dropdown>
      <Form.Dropdown id="qualityProfileId" title="Quality Profile" defaultValue={qualities[0]?.value}>
        {qualities.map((item) => (
          <Form.Dropdown.Item key={item.value} title={item.title} value={item.value} />
        ))}
      </Form.Dropdown>
      <Form.Dropdown id="metadataProfileId" title="Metadata Profile" defaultValue={metadataProfiles[0]?.value}>
        {metadataProfiles.map((item) => (
          <Form.Dropdown.Item key={item.value} title={item.title} value={item.value} />
        ))}
      </Form.Dropdown>
      <Form.Checkbox id="monitored" label="Monitored" defaultValue={true} />
      <Form.Dropdown id="monitor" title="Monitor" defaultValue="all">
        <Form.Dropdown.Item value="all" title="All Albums" />
        <Form.Dropdown.Item value="future" title="Future Albums" />
        <Form.Dropdown.Item value="missing" title="Missing Albums" />
        <Form.Dropdown.Item value="none" title="None" />
      </Form.Dropdown>
      <Form.Checkbox id="searchForMissingAlbums" label="Search for Missing Albums" defaultValue={true} />
      {isSubmitting && <Form.Description title="Status" text="Adding artist..." />}
    </Form>
  );
}
