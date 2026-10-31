import { Action, ActionPanel, Form, Icon, LocalStorage } from "@raycast/api";
import { basename } from "node:path";
import { useEffect, useMemo, useState } from "react";
import {
  ExportFormat,
  Settings,
  formatSize,
  mediaFiles,
  rankFavorites,
  whisperLanguageName,
  whisperLanguages,
} from "./core";
import { openSetup } from "./open-setup";
import {
  TranscriptionOptions,
  WhisperModel,
  canTranslate,
  modelName,
  whisperModels,
} from "./whisper";

export const captionFormats: { value: ExportFormat; title: string }[] = [
  { value: "raw", title: "RAW · TXT" },
  { value: "txt", title: "Clean TXT" },
  { value: "srt", title: "SRT" },
  { value: "vtt", title: "VTT" },
];

export function formatTitle(format: ExportFormat): string {
  return (
    captionFormats.find((item) => item.value === format)?.title ||
    format.toUpperCase()
  );
}

/** Favorite languages saved with Edit Favorite Languages, starting from the preference. */
export function useFavoriteLanguages(settings: Settings) {
  const [value, setValue] = useState(settings.favoriteLanguages ?? "");
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    LocalStorage.getItem<string>("favoriteLanguages")
      .then(
        (stored) => stored !== undefined && setValue(stored),
        () => undefined,
      )
      .finally(() => setLoaded(true));
  }, []);

  return {
    value,
    loaded,
    save(next: string) {
      setValue(next);
      LocalStorage.setItem("favoriteLanguages", next);
    },
  };
}

/** Installed whisper models, with the default model first. */
export function useWhisperModels(settings: Settings) {
  const [state, setState] = useState<{
    models: WhisperModel[];
    defaultModel?: string;
    loaded: boolean;
  }>({ models: [], loaded: false });

  useEffect(() => {
    whisperModels(settings).then(
      (value) => setState({ ...value, loaded: true }),
      () => setState({ models: [], loaded: true }),
    );
  }, []);

  return state;
}

/** Languages with the favorite languages first; its form value is a whisper.cpp language code. */
export function LanguageDropdown({
  title,
  favoriteLanguages,
  defaultLanguage,
  detectAutomatically,
}: {
  title: string;
  favoriteLanguages: string;
  defaultLanguage: string;
  detectAutomatically?: boolean;
}) {
  const { favorites, suggestions } = rankFavorites(
    whisperLanguages,
    (language) => [language.code, language.name],
    favoriteLanguages,
  );
  const featured = new Set([...favorites, ...suggestions]);
  const item = (language: { code: string; name: string }) => (
    <Form.Dropdown.Item
      key={language.code}
      value={language.code}
      title={language.name}
      keywords={[language.code]}
    />
  );
  return (
    <Form.Dropdown
      id="language"
      title={title}
      defaultValue={
        !detectAutomatically && defaultLanguage === "auto"
          ? (favorites[0]?.code ?? "en")
          : defaultLanguage
      }
      info="Your favorite languages are listed first."
    >
      {favorites.length > 0 && (
        <Form.Dropdown.Section title="Favorite Languages">
          {favorites.map(item)}
        </Form.Dropdown.Section>
      )}
      {suggestions.length > 0 && (
        <Form.Dropdown.Section title="Suggested Languages">
          {suggestions.map(item)}
        </Form.Dropdown.Section>
      )}
      <Form.Dropdown.Section title="All Languages">
        {detectAutomatically && (
          <Form.Dropdown.Item
            value="auto"
            title={whisperLanguageName("auto")}
            icon={Icon.Wand}
          />
        )}
        {whisperLanguages
          .filter((language) => !featured.has(language))
          .sort((a, b) => a.name.localeCompare(b.name))
          .map(item)}
      </Form.Dropdown.Section>
    </Form.Dropdown>
  );
}

/**
 * Files, spoken language, output format and model; ⌘↵ submits. For a YouTube
 * video, pass `videoTitle` instead of files.
 */
export function TranscribeForm({
  initialPaths = [],
  videoTitle,
  settings,
  favoriteLanguages,
  defaultLanguage,
  defaultFormat = "raw",
  note,
  onTranscribe,
}: {
  initialPaths?: string[];
  videoTitle?: string;
  settings: Settings;
  favoriteLanguages: string;
  defaultLanguage: string;
  defaultFormat?: ExportFormat;
  note?: string;
  onTranscribe: (paths: string[], options: TranscriptionOptions) => void;
}) {
  const [paths, setPaths] = useState(initialPaths);
  const [filesError, setFilesError] = useState<string>();
  const [modelError, setModelError] = useState<string>();
  const [translateError, setTranslateError] = useState<string>();
  const models = useWhisperModels(settings);

  const files = useMemo(() => mediaFiles(paths), [paths]);

  if (!models.loaded) return <Form isLoading />;

  const setupAction = (
    <Action
      title="Manage Tools and Models"
      icon={Icon.Download}
      shortcut={{ modifiers: ["cmd", "shift"], key: "m" }}
      onAction={openSetup}
    />
  );

  return (
    <Form
      navigationTitle={
        videoTitle
          ? `Transcribe ${videoTitle}`
          : files.length === 1
            ? `Transcribe ${basename(files[0])}`
            : "Transcribe"
      }
      actions={
        <ActionPanel>
          {models.models.length === 0 && setupAction}
          <Action.SubmitForm
            title="Transcribe"
            icon={Icon.Microphone}
            onSubmit={(values: {
              language: string;
              format: ExportFormat;
              model?: string;
              translate: boolean;
            }) => {
              if (!videoTitle && !files.length) {
                setFilesError(
                  "Choose audio or video files, or a folder that contains some",
                );
                return;
              }
              const model = models.models.find(
                (item) => item.path === values.model,
              );
              if (model?.missingEncoder && !model.encoderSize) {
                setModelError(
                  `whisper.cpp uses Core ML and needs ${model.missingEncoder} for this model`,
                );
                return;
              }
              if (values.translate && model && !canTranslate(model.path)) {
                setTranslateError(
                  `${modelName(model.path)} can't translate. Choose a model without “turbo”.`,
                );
                return;
              }
              onTranscribe(files, {
                language: values.language,
                format: values.format,
                model: model?.path,
                translate: values.translate,
              });
            }}
          />
          {models.models.length > 0 && setupAction}
        </ActionPanel>
      }
    >
      {note && <Form.Description text={note} />}
      {videoTitle ? (
        <Form.Description title="Video" text={videoTitle} />
      ) : (
        <Form.FilePicker
          id="files"
          title="Files"
          value={paths}
          onChange={(value) => {
            setPaths(value);
            setFilesError(undefined);
          }}
          canChooseDirectories
          allowMultipleSelection
          error={filesError}
          info="Folders are searched, including subfolders, for audio and video files."
        />
      )}
      {!videoTitle && files.length !== paths.length && (
        <Form.Description
          text={
            files.length === 1
              ? "1 audio or video file will be transcribed."
              : `${files.length} audio and video files will be transcribed, one after another.`
          }
        />
      )}
      <LanguageDropdown
        title="Spoken Language"
        favoriteLanguages={favoriteLanguages}
        defaultLanguage={defaultLanguage}
        detectAutomatically
      />
      <Form.Dropdown id="format" title="Output" defaultValue={defaultFormat}>
        {captionFormats.map((format) => (
          <Form.Dropdown.Item
            key={format.value}
            value={format.value}
            title={format.title}
          />
        ))}
      </Form.Dropdown>
      {models.models.length > 0 ? (
        <Form.Dropdown
          id="model"
          title="Model"
          defaultValue={models.defaultModel}
          error={modelError}
          onChange={() => {
            setModelError(undefined);
            setTranslateError(undefined);
          }}
          info="large-v3 is the most accurate and the slowest. large-v3-turbo is much faster and nearly as accurate. Quantized models such as q5_0 are smaller and faster, and slightly less accurate. Download more in Manage Tools and Models."
        >
          {models.models.map((model) => (
            <Form.Dropdown.Item
              key={model.path}
              value={model.path}
              title={modelTitle(model)}
            />
          ))}
        </Form.Dropdown>
      ) : (
        <Form.Description
          title="Model"
          text="No whisper model is installed. Press ⌘⇧M to open Manage Tools and Models and download one, such as large-v3-turbo."
        />
      )}
      <Form.Checkbox
        id="translate"
        title="Translation"
        label="Translate to English"
        defaultValue={false}
        error={translateError}
        onChange={() => setTranslateError(undefined)}
        info="Whisper writes the English translation instead of the spoken language. Turbo models can't translate; use large-v3 or medium."
      />
      <Form.Description
        text={
          videoTitle
            ? "⌘↵ adds the video to the transcription queue. Its audio is downloaded and transcribed with whisper.cpp, and the result is saved to the download folder. The queue keeps running when you close Raycast."
            : "⌘↵ adds the files to the transcription queue. Each result is saved next to its file. The queue keeps running when you close Raycast."
        }
      />
    </Form>
  );
}

function modelTitle(model: WhisperModel): string {
  return [
    modelName(model.path),
    formatSize(model.size),
    model.missingEncoder &&
      (model.encoderSize
        ? `downloads its ${formatSize(model.encoderSize)} Core ML encoder first`
        : "needs Core ML encoder"),
  ]
    .filter(Boolean)
    .join(" · ");
}
