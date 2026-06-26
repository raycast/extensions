/**
 * New Page — ask for a page name, let outl generate the slug, then offer
 * to open the page in the desktop app.
 *
 * Runs `outl --workspace <ws> page create "<name>" --slugify --title
 * "<name>" --json`. The `--slugify` flag tells the CLI to derive the
 * filename-safe slug from the human name through the shared
 * `outl_md::slugify` rule (lowercase, fold accents, non-alnum → `-`), so
 * we never re-implement slugify on the JS side. `page create` is
 * idempotent on the resulting slug, so re-submitting the same name
 * returns its meta rather than erroring.
 */

import React, { useState } from "react";
import {
  Action,
  ActionPanel,
  Form,
  Icon,
  open,
  popToRoot,
  showToast,
  Toast,
} from "@raycast/api";
import { runOutl } from "./lib/cli";
import { pageLink } from "./lib/deeplink";
import { showErrorToast } from "./lib/errors";

/** The `meta` block returned by `page create`. */
interface PageMeta {
  id: string;
  slug: string;
  title: string;
  kind: string;
}

/** The `data` payload of `page create`. */
interface PageCreateData {
  meta: PageMeta;
}

export default function NewPage(): React.JSX.Element {
  const [nameError, setNameError] = useState<string | undefined>();
  const [submitting, setSubmitting] = useState<boolean>(false);

  function validateName(value?: string): boolean {
    if ((value ?? "").trim() === "") {
      setNameError("Name is required");
      return false;
    }
    setNameError(undefined);
    return true;
  }

  async function handleSubmit(values: { name: string }) {
    if (!validateName(values.name)) {
      return;
    }
    const name = values.name.trim();

    setSubmitting(true);
    try {
      // `--slugify` makes the CLI derive the slug from the name via the
      // shared rule — one owner, no parallel slugify in JS.
      const data = await runOutl<PageCreateData>([
        "page",
        "create",
        name,
        "--slugify",
        "--title",
        name,
      ]);
      const createdSlug = data.meta.slug;

      await showToast({
        style: Toast.Style.Success,
        title: "Page created",
        message: createdSlug,
        primaryAction: {
          title: "Open in outl",
          onAction: async () => {
            await open(pageLink(createdSlug));
          },
        },
      });
      await open(pageLink(createdSlug));
      await popToRoot();
    } catch (err) {
      await showErrorToast(err);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Form
      isLoading={submitting}
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Create Page"
            icon={Icon.NewDocument}
            onSubmit={handleSubmit}
          />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="name"
        title="Name"
        placeholder="My Ideas"
        info="The page name. outl generates the filename-safe slug from it (e.g. “My Ideas” → my-ideas)."
        error={nameError}
        onChange={(v) => {
          if (nameError) {
            validateName(v);
          }
        }}
        onBlur={(e) => validateName(e.target.value)}
      />
    </Form>
  );
}
