import { addSeries, getQualityProfiles, getRootFolders } from "@/lib/hooks/useSonarrAPI";
import type { AddSeriesOptions, QualityProfile, RootFolder, SeriesLookup } from "@/lib/types/series";
import { Action, ActionPanel, Form, Icon, showToast, Toast, useNavigation } from "@raycast/api";
import { useEffect, useState } from "react";

interface AddSeriesFormProps {
  series: SeriesLookup;
  onSeriesAdded: () => void;
}

export default function AddSeriesForm({ series, onSeriesAdded }: AddSeriesFormProps) {
  const { pop } = useNavigation();
  const [isLoading, setIsLoading] = useState(true);
  const [rootFolders, setRootFolders] = useState<RootFolder[]>([]);
  const [qualityProfiles, setQualityProfiles] = useState<QualityProfile[]>([]);

  useEffect(() => {
    async function loadOptions() {
      setIsLoading(true);
      try {
        const [folders, profiles] = await Promise.all([getRootFolders(), getQualityProfiles()]);
        setRootFolders(folders);
        setQualityProfiles(profiles);
      } catch (error) {
        showToast({
          style: Toast.Style.Failure,
          title: "Failed to load options",
          message: error instanceof Error ? error.message : "Unknown error",
        });
      } finally {
        setIsLoading(false);
      }
    }

    loadOptions();
  }, []);

  async function handleSubmit(values: {
    rootFolderPath: string;
    qualityProfileId: string;
    monitored: boolean;
    seasonFolder: boolean;
    searchOnAdd: boolean;
  }) {
    if (rootFolders.length === 0 || qualityProfiles.length === 0) {
      showToast({
        style: Toast.Style.Failure,
        title: "Configuration Error",
        message: "No root folders or quality profiles configured in Sonarr",
      });
      return;
    }

    const options: AddSeriesOptions = {
      title: series.title,
      qualityProfileId: parseInt(values.qualityProfileId),
      titleSlug: series.titleSlug,
      images: series.images,
      seasons: series.seasons.map((season) => ({
        seasonNumber: season.seasonNumber,
        monitored: values.monitored,
      })),
      tvdbId: series.tvdbId,
      tvRageId: series.tvRageId,
      tvMazeId: series.tvMazeId,
      imdbId: series.imdbId,
      rootFolderPath: values.rootFolderPath,
      monitored: values.monitored,
      seasonFolder: values.seasonFolder,
      addOptions: {
        searchForMissingEpisodes: values.searchOnAdd,
        searchForCutoffUnmetEpisodes: false,
      },
    };

    try {
      await addSeries(options);
      onSeriesAdded();
      pop();
    } catch {
      // Error toast already shown by addSeries()
    }
  }

  if (isLoading) {
    return <Form isLoading={true} />;
  }

  if (rootFolders.length === 0 || qualityProfiles.length === 0) {
    return (
      <Form>
        <Form.Description
          title="Configuration Required"
          text="Please configure root folders and quality profiles in Sonarr before adding series."
        />
      </Form>
    );
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Add Series" icon={Icon.Plus} onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.Description title="Add Series to Sonarr" text={`Adding: ${series.title} (${series.year})`} />

      <Form.Dropdown id="rootFolderPath" title="Root Folder" defaultValue={rootFolders[0]?.path}>
        {rootFolders.map((folder) => (
          <Form.Dropdown.Item key={folder.path} value={folder.path} title={folder.path} />
        ))}
      </Form.Dropdown>

      <Form.Dropdown id="qualityProfileId" title="Quality Profile" defaultValue={qualityProfiles[0]?.id.toString()}>
        {qualityProfiles.map((profile) => (
          <Form.Dropdown.Item key={profile.id} value={profile.id.toString()} title={profile.name} />
        ))}
      </Form.Dropdown>

      <Form.Checkbox id="monitored" label="Monitor Series" defaultValue={true} />

      <Form.Checkbox id="seasonFolder" label="Use Season Folders" defaultValue={true} />

      <Form.Checkbox id="searchOnAdd" label="Search for Missing Episodes on Add" defaultValue={false} />
    </Form>
  );
}
