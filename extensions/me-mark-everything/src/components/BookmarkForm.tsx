/** Creation container adapted from raindrop-io (MIT, 4cd99da7). */
import { Action, ActionPanel, Form, Icon, showToast, Toast, useNavigation } from "@raycast/api";
import { useForm } from "@raycast/utils";
import { useEffect, useMemo, useRef, useState } from "react";
import { buildCollectionsOptions } from "../helpers/collections";
import { canonicalUrl, type SavedHit } from "../helpers/duplicates";
import { tagChoices, usable } from "../helpers/edit";
import { toCollections } from "../helpers/me";
import { prefill } from "../helpers/prefill";
import { MAX_URLS, prepareNewBookmarks, SaveInputError } from "../helpers/save";
import { inputUrl } from "../helpers/url";
import { useCollections } from "../hooks/useCollections";
import { useSavedLookup } from "../hooks/useSavedLookup";
import { useTags } from "../hooks/useTags";
import { useSubmission } from "../hooks/useSubmission";
import { manager, failure, ME_INSTALL_URL } from "../ui";
import { session } from "../session";
import { Failure } from "../helper";
import type { FormValues } from "../types";
import type { Outcome } from "../helpers/submission";
import { getShortcuts } from "../shortcut-settings";
import AlreadySaved from "./AlreadySaved";
import { BookmarkFields } from "./BookmarkFields";
import { showOutcome, SubmissionActions } from "./SubmissionActions";

const EMPTY: FormValues = { link: "", title: "", note: "", collection: "-1", tags: [] };
type Row = { id: number; url: string; title: string; urlTouched?: boolean; titleTouched?: boolean };
const fieldId = (index: number) => (index ? `url${index}` : "url");
export const BookmarkForm = (props: {
  isLoading?: boolean;
  defaultLink?: string;
  defaultValues?: Partial<FormValues>;
}) => {
  const { push } = useNavigation();
  const mounted = useRef(true),
    nextId = useRef(1);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);
  const [rows, setRows] = useState<Row[]>([
    { id: 0, url: props.defaultLink ?? "", title: props.defaultValues?.title ?? "" },
  ]);
  const [errors, setErrors] = useState<Record<number, string>>({});
  const [submitHits, setSubmitHits] = useState<SavedHit[]>([]);
  const collections = useCollections(),
    tags = useTags(),
    submission = useSubmission();
  const [collectionOptions, tagOptions] = useMemo(
    () =>
      [
        collections.entities && buildCollectionsOptions(toCollections(collections.entities.filter(usable))),
        tags.entities && tagChoices(tags.entities, []).items,
      ] as const,
    [collections.entities, tags.entities],
  );
  const lookup = useSavedLookup(
    rows.map((row) => row.url),
    submission.ready && !submission.pending && !submission.busy,
  );
  const hits = submitHits.length ? submitHits : (lookup.lookup?.hits ?? []);
  const complete = async (outcome: Outcome) => {
    if (!mounted.current) return;
    await showOutcome(outcome);
    if (outcome.kind === "committed" || outcome.kind === "committed-conflict") {
      reset(EMPTY);
      setRows([{ id: nextId.current++, url: "", title: "" }]);
      setErrors({});
      setSubmitHits([]);
      lookup.reload();
    }
  };
  const { handleSubmit, itemProps, reset } = useForm<FormValues>({
    initialValues: { ...EMPTY, ...props.defaultValues },
    async onSubmit(submitted) {
      const entries = rows.map(({ url, title }) => ({ url, title }));
      setErrors({});
      setSubmitHits([]);
      const outcome = await submission.controller.start("create", async () => {
        const active = await session();
        const values = {
          ...submitted,
          entries,
          tags: submitted.tags ?? itemProps.tags.value ?? [],
          collection: submitted.collection ?? itemProps.collection.value ?? "-1",
        };
        if (
          (values.collection !== "-1" && collections.libraryId !== active.libraryId) ||
          (values.tags.length && tags.libraryId !== active.libraryId)
        )
          throw new Failure("LIBRARY_MISMATCH", "Reload options for the current library.");
        if (
          values.tags.some((id) => !tagOptions?.some((tag) => tag._id === id)) ||
          (values.collection !== "-1" &&
            !collectionOptions?.some((collection) => collection.value === values.collection))
        )
          throw new Failure("INVALID", "Selected collection or tag is unavailable. Reload options.");
        try {
          return await prepareNewBookmarks(values, active);
        } catch (error) {
          if (mounted.current && error instanceof SaveInputError) {
            setErrors(error.fields);
            setSubmitHits(error.hits);
          }
          throw error;
        }
      });
      await complete(outcome);
    },
  });
  const appliedLink = useRef(props.defaultLink),
    pageTitle = props.defaultValues?.title;
  useEffect(() => {
    if (submission.pending || !props.defaultLink || props.defaultLink === appliedLink.current) return;
    const page = { url: props.defaultLink, title: pageTitle ?? "" };
    const previous = appliedLink.current;
    appliedLink.current = props.defaultLink;
    setRows((current) =>
      current.map((row, index) => {
        // This capture belongs to the initially opened row, not a replacement row.
        if (index || row.id !== 0) return row;
        const result = prefill({ link: row.url, title: row.title }, previous, page, {
          link: row.urlTouched,
          title: row.titleTouched,
        });
        return { ...row, url: result.link ?? row.url, title: result.title ?? row.title };
      }),
    );
  }, [props.defaultLink, pageTitle, submission.pending]);
  const changeRow = (index: number, update: Partial<Row>) => {
    setRows((current) =>
      current.map((row, i) =>
        i === index
          ? {
              ...row,
              ...update,
              urlTouched: row.urlTouched || update.url !== undefined,
              titleTouched: row.titleTouched || update.title !== undefined,
            }
          : row,
      ),
    );
    setErrors({});
    setSubmitHits([]);
  };
  return (
    <Form
      isLoading={props.isLoading || !submission.ready || submission.busy}
      actions={
        <ActionPanel>
          {submission.ready &&
            !submission.busy &&
            !submission.error &&
            (submission.pending ? (
              <SubmissionActions controller={submission.controller} session={session} onOutcome={complete} />
            ) : (
              <Action.SubmitForm
                title="Save Bookmarks"
                shortcut={getShortcuts().shortcutSave}
                icon={Icon.PlusCircle}
                onSubmit={handleSubmit}
              />
            ))}
          {!submission.pending && !submission.busy && (
            <>
              <Action
                title="Add Another URL"
                shortcut={getShortcuts().shortcutAddUrl}
                icon={Icon.Plus}
                onAction={async () => {
                  if (rows.length >= MAX_URLS) {
                    await showToast({
                      style: Toast.Style.Failure,
                      title: "Maximum 10 URLs",
                      message: "Save these bookmarks before adding more.",
                    });
                    return;
                  }
                  setRows((current) =>
                    current.length < MAX_URLS
                      ? [...current, { id: nextId.current++, url: "", title: "" }]
                      : current,
                  );
                }}
              />
              {rows.length > 1 && (
                <ActionPanel.Submenu
                  title="Remove URL…"
                  icon={Icon.Minus}
                  shortcut={getShortcuts().shortcutRemoveUrl}
                >
                  {rows.map((row, index) => (
                    <Action
                      key={row.id}
                      title={`URL ${index + 1}`}
                      onAction={() => {
                        setRows((current) => current.filter((item) => item.id !== row.id));
                        setErrors({});
                        setSubmitHits([]);
                      }}
                    />
                  ))}
                </ActionPanel.Submenu>
              )}
              {!!hits.length && (
                <Action
                  title="View Existing Bookmarks"
                  icon={Icon.Bookmark}
                  onAction={() => push(<AlreadySaved links={hits.map((hit) => hit.link)} />)}
                />
              )}
              <Action
                title="Reload Options"
                icon={Icon.ArrowClockwise}
                shortcut={getShortcuts().shortcutRefresh}
                onAction={async () => {
                  await Promise.all([collections.revalidate(), tags.revalidate()]);
                  setSubmitHits([]);
                  setErrors({});
                  lookup.reload();
                }}
              />
            </>
          )}
          <Action
            title="Open in ME Manager"
            icon={Icon.Globe}
            shortcut={getShortcuts().shortcutManager}
            onAction={() =>
              void session()
                .then((active) => manager(active))
                .catch(failure)
            }
          />
          <Action.OpenInBrowser title="ME Installation Guide" url={ME_INSTALL_URL} />
        </ActionPanel>
      }
    >
      {submission.error && (
        <Form.Description title="Cannot load pending save" text={submission.error.message} />
      )}
      {submission.pending ? (
        <Form.Description
          title="Previous save"
          text={`Check the original command in library ${submission.pending.libraryId}. New submissions are paused.`}
        />
      ) : (
        <>
          {lookup.error && (
            <Form.Description
              title="Library check"
              text={`Cannot confirm duplicates: ${lookup.error.message} Saving checks again.`}
            />
          )}
          <BookmarkFields
            itemProps={itemProps}
            collections={collectionOptions}
            tags={tagOptions}
            collectionsError={collections.error}
            tagsError={tags.error}
            identity={
              <>
                {rows.map((row, index) => {
                  let duplicate = false;
                  try {
                    const key = canonicalUrl(inputUrl(row.url));
                    duplicate = hits.some((hit) => canonicalUrl(hit.link) === key);
                  } catch {
                    /* Incomplete inputs are validated at submit. */
                  }
                  return (
                    <URLFields
                      key={row.id}
                      row={row}
                      index={index}
                      error={
                        errors[index] ??
                        (duplicate
                          ? "Already saved. View the existing bookmark or change/remove this URL."
                          : undefined)
                      }
                      onChange={(update) => changeRow(index, update)}
                    />
                  );
                })}
                <Form.Description
                  title="URLs"
                  text={`${rows.length} of 10 · Use Actions → Add Another URL / Remove URL. Each URL has its own title; the fields below apply to all rows.`}
                />
              </>
            }
          />
        </>
      )}
    </Form>
  );
};

function URLFields({
  row,
  index,
  error,
  onChange,
}: {
  row: Row;
  index: number;
  error?: string;
  onChange: (update: Partial<Row>) => void;
}) {
  const ref = useRef<Form.TextField>(null);
  const titleRef = useRef<Form.TextField>(null);
  const initial = useRef(row);
  useEffect(() => {
    // Raycast retains native values when numbered field IDs are reused.
    if (initial.current.id !== 0) {
      if (!initial.current.url) ref.current?.reset();
      if (!initial.current.title) titleRef.current?.reset();
    }
    ref.current?.focus();
  }, []);
  return (
    <>
      <Form.TextField
        id={fieldId(index)}
        ref={ref}
        title={index ? `URL ${index + 1}` : "URL"}
        value={row.url}
        onChange={(url) => onChange({ url })}
        error={error}
        placeholder="https://example.com"
        info="One complete URL per field. Commas and semicolons stay inside the URL."
      />
      <Form.TextField
        id={index ? `title${index}` : "title"}
        ref={titleRef}
        title={index ? `Title ${index + 1}` : "Title"}
        value={row.title}
        onChange={(title) => onChange({ title })}
        placeholder="Page title"
      />
    </>
  );
}
