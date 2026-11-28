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
import { showFailureToast, useForm } from "@raycast/utils";
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
  const [slugEdited, setSlugEdited] = useState(Boolean(fixedSlug));
  const [isLoading, setIsLoading] = useState(!fixedSlug);

  const { handleSubmit, itemProps, setValue } = useForm<FormValues>({
    initialValues: { paths: [], slug: fixedSlug ?? "" },
    validation: {
      paths: (value) => {
        if (!value?.[0]) return "Choose a file or folder";
      },
      ...(fixedSlug
        ? {}
        : {
            slug: (value) => {
              if (!isValidSlug((value ?? "").trim())) return "Lowercase letters, digits, and hyphens only";
            },
          }),
    },
    async onSubmit(values) {
      const target = values.paths?.[0];
      const finalSlug = (fixedSlug ?? values.slug).trim();
      if (!target || !isValidSlug(finalSlug)) {
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
    },
  });

  useEffect(() => {
    if (fixedSlug) return;
    getSelectedFinderItems()
      .then((items) => {
        if (items.length > 0) {
          const next = [items[0].path];
          setValue("paths", next);
          setValue("slug", suggestSlug(path.basename(next[0])));
        }
      })
      .catch(() => {
        // Finder is not frontmost or nothing is selected: the user picks a file instead.
      })
      .finally(() => setIsLoading(false));
  }, [fixedSlug, setValue]);

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
        title="File or Folder"
        allowMultipleSelection={false}
        canChooseDirectories
        canChooseFiles
        {...itemProps.paths}
        onChange={(next) => {
          itemProps.paths.onChange?.(next);
          if (!slugEdited && next[0] && !fixedSlug) {
            setValue("slug", suggestSlug(path.basename(next[0])));
          }
        }}
      />
      {fixedSlug ? null : (
        <Form.TextField
          title="Site Name"
          placeholder="my-site-k3j9x2"
          info="Lowercase letters, digits, and hyphens. Publishing to a name you already own updates that site."
          {...itemProps.slug}
          onChange={(value) => {
            setSlugEdited(true);
            itemProps.slug.onChange?.(value);
          }}
        />
      )}
    </Form>
  );
}
