import { Form, getSelectedFinderItems } from "@raycast/api";
import { useEffect, useState } from "react";
import { ToastError } from "./components/ToastError";
import { UploadForm } from "./components/UploadForm";
import { buildBucketOptions, buildDomainOptions } from "./lib/options";
import { loadPreferences } from "./lib/prefs";
import type { UploadSource } from "./lib/upload";

type FinderItem = { path: string; name: string };

export default function Command() {
  const { prefs, profiles } = loadPreferences();
  const [items, setItems] = useState<FinderItem[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const selected = await getSelectedFinderItems();
        const mapped = selected.map((i) => ({ path: i.path, name: i.name })) as FinderItem[];
        setItems(mapped);
      } catch (err) {
        setLoadError(err instanceof Error ? err.message : String(err));
      }
    })();
  }, []);

  const bucketOptions = buildBucketOptions({ profiles, prefs });
  const domainOptions = buildDomainOptions({ profiles, prefs });

  if (!bucketOptions.length) {
    return (
      <ToastError
        title="No buckets configured"
        message="Add Bucket Names or Bucket Profiles (JSON) in Extension Preferences."
        openPreferences
      />
    );
  }
  if (loadError) {
    return <ToastError title="Can't read Finder selection" message={loadError} />;
  }
  if (!items) {
    return <Form isLoading navigationTitle="Upload Selected Files" />;
  }
  if (!items.length) {
    return <ToastError title="No files selected" message="Select one or more files in Finder, then run again." />;
  }

  const sources: UploadSource[] = items.map((it) => ({ kind: "file-path", filePath: it.path }));
  const title = `Upload Selected File (${items.length} selected)`;

  return (
    <UploadForm
      title={title}
      prefs={prefs}
      bucketOptions={bucketOptions}
      domainOptions={domainOptions}
      sources={sources}
    />
  );
}
