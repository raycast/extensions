import {
  Action,
  ActionPanel,
  Clipboard,
  Form,
  getSelectedFinderItems,
  Icon,
  open,
  showToast,
  Toast,
  useNavigation,
} from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import path from "node:path";
import { useEffect, useState } from "react";
import { collectFiles, formatBytes, isValidSlug, publishFiles, suggestSlug } from "../lib/api";
import { getOwnerToken, saveIssuedToken } from "../lib/token";

interface FormValues {
  paths: string[];
  slug: string;
}

/**
 * Publish a file or folder. Without `slug` it creates a new site (or updates one you own);
 * with `slug` it publishes a new version of that site.
 */
export function PublishForm({ slug: fixedSlug, onPublished }: { slug?: string; onPublished?: () => void }) {
  const { pop } = useNavigation();
  const [paths, setPaths] = useState<string[]>([]);
  const [slug, setSlug] = useState(fixedSlug ?? "");
  const [slugEdited, setSlugEdited] = useState(Boolean(fixedSlug));
  const [slugError, setSlugError] = useState<string | undefined>();
  const [pathError, setPathError] = useState<string | undefined>();
  const [isLoading, setIsLoading] = useState(!fixedSlug);

  useEffect(() => {
    if (fixedSlug) return;
    getSelectedFinderItems()
      .then((items) => {
        if (items.length > 0) choosePaths([items[0].path]);
      })
      .catch(() => {
        // Finder is not frontmost or nothing is selected: the user picks a file instead.
      })
      .finally(() => setIsLoading(false));
  }, []);

  function choosePaths(next: string[]) {
    setPaths(next);
    setPathError(undefined);
    if (!slugEdited && next[0]) {
      setSlug(suggestSlug(path.basename(next[0])));
      setSlugError(undefined);
    }
  }

  async function handleSubmit(values: FormValues) {
    const target = values.paths?.[0];
    const finalSlug = (fixedSlug ?? values.slug).trim();
    if (!target) {
      setPathError("Choose a file or folder");
      return;
    }
    if (!isValidSlug(finalSlug)) {
      setSlugError("Lowercase letters, digits, and hyphens only");
      return;
    }

    const toast = await showToast({ style: Toast.Style.Animated, title: "Publishing…" });
    setIsLoading(true);
    try {
      const files = await collectFiles(target);
      const total = files.reduce((sum, f) => sum + f.size, 0);
      toast.message = `${files.length} ${files.length === 1 ? "file" : "files"}, ${formatBytes(total)}`;

      const result = await publishFiles({ files, slug: finalSlug, token: await getOwnerToken() });
      await saveIssuedToken(result.token);
      await Clipboard.copy(result.url);

      toast.style = Toast.Style.Success;
      toast.title = fixedSlug ? "Site updated, URL copied" : "Published, URL copied";
      toast.message = result.url;
      toast.primaryAction = {
        title: "Open in Browser",
        shortcut: { modifiers: ["cmd"], key: "o" },
        onAction: () => open(result.url),
      };
      onPublished?.();
      if (fixedSlug) pop();
    } catch (error) {
      await showFailureToast(error, { title: "Could not publish" });
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Form
      isLoading={isLoading}
      navigationTitle={fixedSlug ? `Update ${fixedSlug}` : undefined}
      actions={
        <ActionPanel>
          <Action.SubmitForm title={fixedSlug ? "Update Site" : "Publish"} icon={Icon.Upload} onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.Description
        text={
          fixedSlug
            ? `Replaces the files of https://${fixedSlug}.deed.page/ with a new version. The URL stays the same.`
            : "Publishes to a permanent https://<name>.deed.page/ URL. A single HTML file is served at the site root; a folder keeps its paths."
        }
      />
      <Form.FilePicker
        id="paths"
        title="File or Folder"
        allowMultipleSelection={false}
        canChooseDirectories
        canChooseFiles
        value={paths}
        error={pathError}
        onChange={choosePaths}
      />
      {fixedSlug ? null : (
        <Form.TextField
          id="slug"
          title="Site Name"
          placeholder="my-site-k3j9x2"
          info="Lowercase letters, digits, and hyphens. Publishing to a name you already own updates that site."
          value={slug}
          error={slugError}
          onChange={(value) => {
            setSlug(value);
            setSlugEdited(true);
            setSlugError(value && !isValidSlug(value) ? "Lowercase letters, digits, and hyphens only" : undefined);
          }}
        />
      )}
    </Form>
  );
}
