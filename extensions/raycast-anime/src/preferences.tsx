import { Action, ActionPanel, Form, List, LocalStorage, popToRoot } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { ReactNode } from "react";

const PREFERENCES_KEY = "anime-preferences";

export type ViewMode = "list" | "gallery";

export type AnimePreferences = {
  prefersCrunchyroll: boolean;
  preferredView: ViewMode;
};

const DEFAULT_PREFERENCES: AnimePreferences = {
  prefersCrunchyroll: false,
  preferredView: "gallery",
};

export async function getAnimePreferences() {
  const value = await LocalStorage.getItem<string>(PREFERENCES_KEY);
  return value ? (JSON.parse(value) as AnimePreferences) : undefined;
}

export async function saveAnimePreferences(preferences: AnimePreferences) {
  await LocalStorage.setItem(PREFERENCES_KEY, JSON.stringify(preferences));
}

type PreferencesGateResult =
  | { status: "ready"; preferences: AnimePreferences; revalidate: () => void; isLoadingPreferences: boolean }
  | { status: "gate"; view: ReactNode };

export function usePreferencesGate(): PreferencesGateResult {
  const { data: preferences, isLoading: isLoadingPreferences, revalidate } = useCachedPromise(getAnimePreferences);

  if (!preferences) {
    if (!isLoadingPreferences) {
      return { status: "gate", view: <Onboarding onComplete={revalidate} /> };
    }

    return {
      status: "gate",
      view: (
        <List isLoading searchBarPlaceholder="Loading preferences...">
          <List.EmptyView title="Loading Preferences..." />
        </List>
      ),
    };
  }

  return { status: "ready", preferences, revalidate, isLoadingPreferences };
}

export type ResolvedPreferences = {
  preferences: AnimePreferences;
  revalidate: () => void;
  isLoadingPreferences: boolean;
};

type PreferencesGateProps = {
  children: (props: ResolvedPreferences) => ReactNode;
};

export function PreferencesGate({ children }: PreferencesGateProps) {
  const gate = usePreferencesGate();

  if (gate.status === "gate") {
    return gate.view;
  }

  return children({
    preferences: gate.preferences,
    revalidate: gate.revalidate,
    isLoadingPreferences: gate.isLoadingPreferences,
  });
}

type OnboardingProps = {
  onComplete: () => void;
  defaultPreferences?: AnimePreferences;
  isEditing?: boolean;
};

type OnboardingValues = {
  prefersCrunchyroll: boolean;
  preferredView: ViewMode;
};

export function Onboarding({
  onComplete,
  defaultPreferences = DEFAULT_PREFERENCES,
  isEditing = false,
}: OnboardingProps) {
  return (
    <Form
      navigationTitle={isEditing ? "AniMe Preferences" : "Set Up AniMe"}
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Save Preferences"
            onSubmit={async (values: OnboardingValues) => {
              await saveAnimePreferences({
                prefersCrunchyroll: values.prefersCrunchyroll,
                preferredView: values.preferredView,
              });
              onComplete();
              if (isEditing) {
                await popToRoot();
              }
            }}
          />
        </ActionPanel>
      }
    >
      <Form.Checkbox
        id="prefersCrunchyroll"
        label="I use Crunchyroll"
        defaultValue={defaultPreferences.prefersCrunchyroll}
      />
      <Form.Dropdown id="preferredView" title="Preferred View" defaultValue={defaultPreferences.preferredView}>
        <Form.Dropdown.Item value="gallery" title="Gallery (Recommended)" />
        <Form.Dropdown.Item value="list" title="List" />
      </Form.Dropdown>
    </Form>
  );
}
