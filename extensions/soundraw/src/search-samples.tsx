import { useState, useEffect } from "react";
import { Form, ActionPanel, Action, showToast, Icon, Toast } from "@raycast/api";
import { useForm, useCachedPromise } from "@raycast/utils";
import { searchSamples, getAvailableGenres, SoundrawAPIError } from "./lib/soundraw";
import { Sample } from "./lib/types";
import { cleanupPlayback } from "./lib/audio";
import { SamplesList } from "./components/SamplesList";

type Values = {
  genres: string[];
};

export default function Command() {
  const [hasSearched, setHasSearched] = useState(false);
  const [selectedGenres, setSelectedGenres] = useState<string[]>([]);

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

  const { handleSubmit, itemProps } = useForm<Values>({
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

  const handleNewSearch = () => {
    setHasSearched(false);
    setSamples([]);
    setSelectedGenres([]);
  };

  if (hasSearched) {
    return (
      <SamplesList
        samples={samples}
        isLoading={isLoading}
        onNewSearch={handleNewSearch}
        selectedGenres={selectedGenres}
        availableGenres={availableGenres}
      />
    );
  }

  return (
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
  );
}
