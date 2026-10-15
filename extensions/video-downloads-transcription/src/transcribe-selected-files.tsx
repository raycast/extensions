import { Form, getSelectedFinderItems } from "@raycast/api";
import { useEffect, useState } from "react";
import { defaultWhisperLanguage, localFileInfo } from "./core";
import { preferences } from "./preferences";
import { QueueList, addToQueue, fileJobs, jobToast } from "./queue";
import { TranscribeForm, useFavoriteLanguages } from "./transcription";

export { runQueueWorker } from "./jobs";

export default function Command() {
  const settings = preferences();
  const favoriteLanguages = useFavoriteLanguages(settings);
  const [selection, setSelection] = useState<string[]>();
  const [queued, setQueued] = useState(false);

  useEffect(() => {
    getSelectedFinderItems().then(
      (items) =>
        setSelection(
          items
            .map((item) => item.path.replace(/(.)\/$/, "$1"))
            .filter((path) => localFileInfo(path)),
        ),
      () => setSelection([]),
    );
  }, []);

  if (queued)
    return <QueueList settings={settings} onFinish={(job) => jobToast(job)} />;
  if (!selection || !favoriteLanguages.loaded) return <Form isLoading />;

  return (
    <TranscribeForm
      initialPaths={selection}
      settings={settings}
      favoriteLanguages={favoriteLanguages.value}
      defaultLanguage={defaultWhisperLanguage(
        favoriteLanguages.value,
        settings.whisperLanguage,
      )}
      note={
        selection.length
          ? undefined
          : "Nothing is selected in Finder. Choose files or folders below, or select them in Finder before opening this command."
      }
      onTranscribe={async (paths, options) => {
        await addToQueue(settings, fileJobs(paths, options));
        setQueued(true);
      }}
    />
  );
}
