import { useState, useEffect, useRef } from "react";
import { Form, ActionPanel, Action, showToast, Icon, Toast, LaunchProps, Color, List } from "@raycast/api";
import { useForm, useCachedPromise } from "@raycast/utils";
import { searchSamples, getAvailableGenres, SoundrawAPIError } from "./lib/sounds/soundraw";
import { Sample } from "./lib/types";
import { cleanupPlayback } from "./lib/audio";
import { SamplesList } from "./components/SamplesList";
import { cleanupOldTempFiles } from "./lib/file";
import { useFavoritesRecents } from "./lib/hooks";

type Values = {
  genres: string[];
};

type LaunchArguments = {
  genres?: string; // Comma-separated string of genre keys
};

export type SearchSource = "soundraw" | "favorites" | "recents";

export default function Command(props: LaunchProps<{ arguments: LaunchArguments }>) {
  // Parse comma-separated genres string into array
  const launchGenresString = props.arguments?.genres || "";
  const launchGenres = launchGenresString ? launchGenresString.split(",").filter((g) => g.trim().length > 0) : [];

  const [hasSearched, setHasSearched] = useState(false);
  const [selectedGenres, setSelectedGenres] = useState<string[]>(launchGenres);
  const [searchSource, setSearchSource] = useState<SearchSource>("soundraw");

  // Cleanup old temp files on command launch (older than 4 hours)
  useEffect(() => {
    const fourHoursMs = 4 * 60 * 60 * 1000;
    cleanupOldTempFiles("/tmp", fourHoursMs);
  }, []);

  // Cleanup playback on unmount
  useEffect(() => {
    return () => {
      cleanupPlayback();
    };
  }, []);

  const [isLoading, setIsLoading] = useState(false);
  const [samples, setSamples] = useState<Sample[]>([]);

  // Fetch available genres using useCachedPromise (caches across command runs)
  const { data: genresData, isLoading: isLoadingGenres } = useCachedPromise(() => getAvailableGenres(), [], {
    initialData: { genres: {}, total_count: 0 },
  });

  const availableGenres = genresData?.genres || {};
  const hasAutoSubmittedRef = useRef(false);

  const { handleSubmit, itemProps } = useForm<Values>({
    initialValues: {
      genres: launchGenres,
    },
    onSubmit: async (values) => {
      const { genres } = values;

      setIsLoading(true);
      setHasSearched(true);
      setSelectedGenres(genres || []);

      try {
        const searchParams = { genres: genres || [] };
        const response = await searchSamples(searchParams);

        // Small hack to make sample names more unique by including BPM
        const uniqueSamples = response.samples.map((sample) => ({
          ...sample,
          name: sample.bpm ? `${sample.name} ${sample.bpm}` : sample.name,
        }));

        setSamples(uniqueSamples);
      } catch (error) {
        const errorMessage =
          error instanceof SoundrawAPIError ? error.message : "Failed to search samples. Please try again.";

        await showToast({
          title: "Search Failed",
          message: errorMessage,
          style: Toast.Style.Failure,
        });
        setSamples([]);
      } finally {
        setIsLoading(false);
      }
    },
    validation: {
      genres: (value) => {
        if (!value || value.length === 0) {
          return "Please select at least one genre";
        }
      },
    },
  });

  // Auto-submit if genres were provided via launch arguments
  useEffect(() => {
    if (
      launchGenres.length > 0 &&
      !hasSearched &&
      !hasAutoSubmittedRef.current &&
      Object.keys(availableGenres).length > 0
    ) {
      // Validate that all launch genres exist
      const validGenres = launchGenres.filter((genre) => Object.keys(availableGenres).includes(genre));
      if (validGenres.length > 0) {
        hasAutoSubmittedRef.current = true;
        handleSubmit({ genres: validGenres });
      }
    }
  }, [launchGenres, hasSearched, availableGenres, handleSubmit]);

  const handleNewSearch = () => {
    setHasSearched(false);
    setSamples([]);
    setSelectedGenres([]);
  };

  const { favoriteSamples = [], recentSamples = [] } = useFavoritesRecents();

  // Determine visible samples based on search source
  let visibleSamples: Sample[] = samples;
  let sectionTitle = "Soundraw Samples";
  let isShowingLocalSamples = false;

  if (searchSource === "favorites") {
    visibleSamples = favoriteSamples || [];
    sectionTitle = "Favorite Samples";
    isShowingLocalSamples = true;
  } else if (searchSource === "recents") {
    visibleSamples = recentSamples || [];
    sectionTitle = "Recent Samples";
    isShowingLocalSamples = true;
  }

  const dropdown = (
    <List.Dropdown
      tooltip="Change Source"
      value={searchSource}
      onChange={(v) => {
        // Only update if it's a valid source
        if (v === "soundraw" || v === "favorites" || v === "recents") {
          setSearchSource(v as SearchSource);
        }
      }}
    >
      <List.Dropdown.Section>
        <List.Dropdown.Item title="Soundraw" value="soundraw" icon={{ source: "soundraw.png" }} />
      </List.Dropdown.Section>
      <List.Dropdown.Section>
        <List.Dropdown.Item title="Favorites" value="favorites" icon={{ source: Icon.Star, tintColor: Color.Yellow }} />
        <List.Dropdown.Item title="Recent" value="recents" icon={{ source: Icon.Clock }} />
      </List.Dropdown.Section>
    </List.Dropdown>
  );

  // Show list view if searching OR if showing favorites/recents
  if (hasSearched || isShowingLocalSamples) {
    return (
      <SamplesList
        samples={visibleSamples}
        isLoading={isLoading && !isShowingLocalSamples}
        onNewSearch={handleNewSearch}
        selectedGenres={selectedGenres}
        availableGenres={availableGenres}
        searchBarAccessory={dropdown}
        navigationTitle={sectionTitle}
      />
    );
  }

  return (
    <>
      {dropdown}
      <Form
        isLoading={isLoading || isLoadingGenres}
        actions={
          <ActionPanel>
            <Action.SubmitForm onSubmit={handleSubmit} title="Search Samples" icon={Icon.MagnifyingGlass} />
          </ActionPanel>
        }
      >
        <Form.TagPicker
          title="Genres"
          placeholder="Select genres to search"
          info="Choose one or more genres to find matching samples"
          {...itemProps.genres}
        >
          {Object.entries(availableGenres).map(([key, value]) => (
            <Form.TagPicker.Item key={key} title={value} value={key} />
          ))}
        </Form.TagPicker>
        {isLoadingGenres && <Form.Description text="Loading available genres..." />}
        {!isLoadingGenres && Object.keys(availableGenres).length === 0 && (
          <Form.Description text="No genres available. Please check your API connection." />
        )}
      </Form>
    </>
  );
}
