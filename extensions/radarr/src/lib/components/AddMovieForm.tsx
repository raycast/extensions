import React, { useState, useEffect } from "react";
import { Form, ActionPanel, Action, showToast, Toast, popToRoot, LocalStorage } from "@raycast/api";

import { addMovie, getRootFolders, getQualityProfiles } from "@/lib/hooks/useRadarrAPI";
import { formatMovieTitle } from "@/lib/utils/formatting";
import type { MovieLookup } from "@/lib/types/movie";
import type { RadarrInstance } from "@/lib/types/config";

interface AddMovieFormProps {
  movie: MovieLookup;
  instance: RadarrInstance;
}

interface FormValues {
  qualityProfileId: string;
  rootFolderPath: string;
  monitored: boolean;
  searchOnAdd: boolean;
}

interface RememberedAddMovieOptions {
  monitored: boolean;
  searchOnAdd: boolean;
  qualityProfileName: string;
}

const LAST_ADD_MOVIE_OPTIONS_KEY = "last-add-movie-options";

export default function AddMovieForm({ movie, instance }: AddMovieFormProps) {
  const [rootFolders, setRootFolders] = useState<{ path: string; id: number }[]>([]);
  const [qualityProfiles, setQualityProfiles] = useState<{ name: string; id: number }[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [rememberedOptions, setRememberedOptions] = useState<RememberedAddMovieOptions | null>(null);
  const preferredQualityProfileName = rememberedOptions?.qualityProfileName.trim().toLowerCase();
  const defaultQualityProfileId =
    qualityProfiles
      .find(profile => preferredQualityProfileName && profile.name.trim().toLowerCase() === preferredQualityProfileName)
      ?.id.toString() ?? qualityProfiles[0]?.id.toString();

  useEffect(() => {
    const loadOptions = async () => {
      try {
        const [folders, profiles, savedOptions] = await Promise.all([
          getRootFolders(instance),
          getQualityProfiles(instance),
          LocalStorage.getItem<string>(LAST_ADD_MOVIE_OPTIONS_KEY),
        ]);

        setRootFolders(folders);
        setQualityProfiles(profiles);
        setRememberedOptions(savedOptions ? (JSON.parse(savedOptions) as RememberedAddMovieOptions) : null);

        if (folders.length === 0) {
          showToast({
            style: Toast.Style.Failure,
            title: "No Root Folders",
            message: "Please configure root folders in Radarr first",
          });
        }

        if (profiles.length === 0) {
          showToast({
            style: Toast.Style.Failure,
            title: "No Quality Profiles",
            message: "Please configure quality profiles in Radarr first",
          });
        }
      } catch {
        showToast({
          style: Toast.Style.Failure,
          title: "Loading Error",
          message: "Unable to load configuration options",
        });
      } finally {
        setIsLoading(false);
      }
    };

    loadOptions();
  }, [instance]);

  const handleSubmit = async (values: FormValues) => {
    try {
      await addMovie(
        instance,
        movie,
        parseInt(values.qualityProfileId),
        values.rootFolderPath,
        values.monitored,
        values.searchOnAdd,
      );

      const selectedQualityProfile = qualityProfiles.find(profile => profile.id.toString() === values.qualityProfileId);
      await LocalStorage.setItem(
        LAST_ADD_MOVIE_OPTIONS_KEY,
        JSON.stringify({
          monitored: values.monitored,
          searchOnAdd: values.searchOnAdd,
          qualityProfileName: selectedQualityProfile?.name ?? "",
        } satisfies RememberedAddMovieOptions),
      );

      popToRoot();
    } catch (error) {
      console.error("Add movie error:", error);
      showToast({
        style: Toast.Style.Failure,
        title: "Failed to Add Movie",
        message: error instanceof Error ? error.message : "Unknown error occurred",
      });
    }
  };

  if (isLoading) {
    return <Form isLoading={true} />;
  }

  if (rootFolders.length === 0 || qualityProfiles.length === 0) {
    return (
      <Form
        actions={
          <ActionPanel>
            <Action title="Back" onAction={popToRoot} />
          </ActionPanel>
        }
      >
        <Form.Description text="Incomplete configuration. Please check your Radarr settings." />
      </Form>
    );
  }

  return (
    <Form
      navigationTitle={`Add: ${formatMovieTitle(movie)}`}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Add Movie" onSubmit={handleSubmit} />
          <Action title="Cancel" onAction={popToRoot} />
        </ActionPanel>
      }
    >
      <Form.Description text={`Configure settings to add "${formatMovieTitle(movie)}" to your Radarr collection`} />

      <Form.Dropdown id="qualityProfileId" title="Quality Profile" defaultValue={defaultQualityProfileId}>
        {qualityProfiles.map(profile => (
          <Form.Dropdown.Item key={profile.id} value={profile.id.toString()} title={profile.name} />
        ))}
      </Form.Dropdown>

      <Form.Dropdown id="rootFolderPath" title="Root Folder" defaultValue={rootFolders[0]?.path}>
        {rootFolders.map(folder => (
          <Form.Dropdown.Item key={folder.id} value={folder.path} title={folder.path} />
        ))}
      </Form.Dropdown>

      <Form.Checkbox
        id="monitored"
        label="Monitor this movie"
        defaultValue={rememberedOptions?.monitored ?? true}
        info="If enabled, Radarr will automatically monitor for new releases of this movie"
      />

      <Form.Checkbox
        id="searchOnAdd"
        label="Search immediately"
        defaultValue={rememberedOptions?.searchOnAdd ?? true}
        info="If enabled, Radarr will immediately search for this movie after adding"
      />
    </Form>
  );
}
