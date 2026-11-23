import { getShortcuts } from "../shortcut-settings";
import { Action, ActionPanel, Detail, Form, Icon, useNavigation } from "@raycast/api";
import { useForm } from "@raycast/utils";
import { useCallback, useEffect, useRef, useState } from "react";
import { randomUUID } from "node:crypto";
import { Failure, getBookmark, type Entity, type Session } from "../helper";
import { editBaseline, prepareEdit, preflightEdit, tagChoices, usable, type TagChoices } from "../helpers/edit";
import { findSaved } from "../helpers/duplicates";
import { buildCollectionsOptions } from "../helpers/collections";
import { toCollections } from "../helpers/me";
import type { Outcome } from "../helpers/submission";
import { useTags } from "../hooks/useTags";
import { useCollections } from "../hooks/useCollections";
import { useSubmission } from "../hooks/useSubmission";
import { failure, manager } from "../ui";
import { session } from "../session";
import type { CollectionItem, EditBaseline, FormValues } from "../types";
import { BookmarkFields } from "./BookmarkFields";
import { outcomeText, showOutcome, SubmissionActions } from "./SubmissionActions";
import { TrashBookmarkActions } from "./TrashBookmarkActions";

type Snapshot = { entity: Entity; baseline: EditBaseline; session: Session };
export default function EditBookmark(props: {
  id: string;
  revalidate: () => void | Promise<void>;
  onViewExisting: (links: string[]) => void;
}) {
  const submission = useSubmission();
  const editing = useRef(false);
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);
  const [snapshot, setSnapshot] = useState<Snapshot>();
  const [error, setError] = useState<Error>();
  const [generation, setGeneration] = useState(0);
  const [result, setResult] = useState<Outcome>();
  const tags = useTags(snapshot?.session ?? null),
    collections = useCollections(snapshot?.session ?? null);
  const { pop } = useNavigation();
  const loadGeneration = useRef(0);
  const load = useCallback(async () => {
    const request = ++loadGeneration.current;
    setError(undefined);
    setSnapshot(undefined);
    try {
      const active = await session();
      const entity = await getBookmark(active, props.id);
      if (!mounted.current || request !== loadGeneration.current) return;
      setSnapshot({ session: active, entity: structuredClone(entity), baseline: editBaseline(entity) });
      setGeneration((n) => n + 1);
    } catch (cause) {
      if (!mounted.current || request !== loadGeneration.current) return;
      setError(cause instanceof Error ? cause : new Error(String(cause)));
    }
  }, [props.id]);
  useEffect(() => {
    void load();
    return () => {
      loadGeneration.current++;
    };
  }, [load]);
  const openManager = () =>
    void session()
      .then((s) => manager(s, props.id))
      .catch(failure);
  const complete = async (outcome: Outcome) => {
    if (!mounted.current) return;
    setResult(outcome);
    await showOutcome(outcome);
    if (outcome.kind === "committed" || outcome.kind === "committed-conflict") {
      try {
        await props.revalidate();
      } catch (cause) {
        const failed: Outcome = {
          kind: "committed-read-failed",
          error: cause instanceof Error ? cause : new Error(String(cause)),
        };
        setResult(failed);
        await showOutcome(failed);
        return;
      }
      if (!mounted.current) return;
      if (outcome.kind === "committed" && outcome.entities.some((e) => e.id === props.id)) pop();
      else if (outcome.kind === "committed") await load();
    }
  };
  const managerAction = (
    <Action
      title="Open in ME Manager"
      shortcut={getShortcuts().shortcutManager}
      icon={Icon.Globe}
      onAction={openManager}
    />
  );
  if (submission.error)
    return (
      <Detail
        markdown={`# Cannot load pending submission\n\n${submission.error.message}`}
        actions={<ActionPanel>{managerAction}</ActionPanel>}
      />
    );
  if (submission.pending && !editing.current)
    return (
      <Detail
        isLoading={submission.busy}
        markdown={`# ${result ? outcomeText(result).title : "Check previous change"}\n\n${result ? outcomeText(result).message : "The original command is kept. Check it before making another edit."}\n\nLibrary: ${submission.pending.libraryId}\n\nEntities: ${submission.pending.entities.join(", ")}`}
        actions={
          <ActionPanel>
            {!submission.busy && (
              <SubmissionActions controller={submission.controller} session={session} onOutcome={complete} />
            )}
            {managerAction}
          </ActionPanel>
        }
      />
    );
  if (result?.kind === "committed-conflict" || (result?.kind === "committed-read-failed" && !submission.pending))
    return (
      <Detail
        markdown={`# ${outcomeText(result).title}\n\n${outcomeText(result).message}`}
        actions={
          <ActionPanel>
            {managerAction}
            <Action
              title="Refresh Saved Bookmark"
              icon={Icon.ArrowClockwise}
              shortcut={getShortcuts().shortcutRefresh}
              onAction={async () => {
                try {
                  await props.revalidate();
                  await load();
                  setResult(undefined);
                } catch (e) {
                  failure(e);
                }
              }}
            />
          </ActionPanel>
        }
      />
    );
  if (error)
    return (
      <Detail
        markdown={`# Cannot edit this bookmark\n\n${error.message}`}
        actions={
          <ActionPanel>
            <Action
              title="Reload Bookmark"
              icon={Icon.ArrowClockwise}
              shortcut={getShortcuts().shortcutRefresh}
              onAction={load}
            />
            {managerAction}
          </ActionPanel>
        }
      />
    );
  if (!submission.ready || !snapshot || tags.isLoading || collections.isLoading)
    return <Detail isLoading markdown="Loading bookmark…" />;
  let choices: TagChoices | undefined, options: CollectionItem[] | undefined;
  try {
    if (tags.entities) {
      if (tags.libraryId !== snapshot.session.libraryId)
        throw new Failure("LIBRARY_MISMATCH", "Tags belong to another library.");
      choices = tagChoices(tags.entities, snapshot.baseline.tags);
    }
    if (collections.entities) {
      if (collections.libraryId !== snapshot.session.libraryId)
        throw new Failure("LIBRARY_MISMATCH", "Collections belong to another library.");
      options = buildCollectionsOptions(toCollections(collections.entities.filter(usable)));
      if (snapshot.baseline.collection !== "-1" && !options.some((c) => c.value === snapshot.baseline.collection))
        throw new Failure("INVALID", "The bookmark's collection is unavailable. Open the ME manager.");
    }
  } catch (cause) {
    return (
      <Detail
        markdown={`# Options need review\n\n${String(cause)}`}
        actions={<ActionPanel>{managerAction}</ActionPanel>}
      />
    );
  }
  editing.current = true;
  return (
    <Editor
      key={generation}
      snapshot={snapshot}
      tags={choices}
      collections={options}
      tagsError={tags.error}
      collectionsError={collections.error}
      submission={submission}
      complete={complete}
      reload={load}
      openManager={openManager}
      onViewExisting={props.onViewExisting}
    />
  );
}

function Editor(props: {
  snapshot: Snapshot;
  tags?: TagChoices;
  collections?: CollectionItem[];
  tagsError?: Error;
  collectionsError?: Error;
  submission: ReturnType<typeof useSubmission>;
  complete: (outcome: Outcome) => Promise<void>;
  reload: () => Promise<void>;
  openManager: () => void;
  onViewExisting: (links: string[]) => void;
}) {
  const {
    snapshot: { entity, baseline, session: active },
    submission,
  } = props;
  const [duplicateLinks, setDuplicateLinks] = useState<string[]>();
  const [result, setResult] = useState<Outcome>();
  const { handleSubmit, itemProps } = useForm<FormValues>({
    initialValues: {
      link: baseline.link,
      title: baseline.title,
      note: baseline.note,
      description: baseline.description,
      favorite: baseline.favorite,
      collection: baseline.collection,
      tags: props.tags?.selected ?? [],
    },
    async onSubmit(values) {
      setDuplicateLinks(undefined);
      const outcome = await submission.controller.start("edit", async () => {
        const pending = prepareEdit(entity, baseline, values, randomUUID(), active, {
          tags: props.tags,
          collections: props.collections?.map((c) => c.value),
        });
        if (!pending) return null;
        if (values.link !== baseline.link) {
          const hits = await findSaved(active, [values.link], undefined, entity.id);
          if (hits.length) {
            setDuplicateLinks([values.link]);
            throw new Failure("DUPLICATE", "This URL is already saved. Input kept; no changes submitted.");
          }
        }
        await preflightEdit(pending);
        return pending;
      });
      setResult(outcome);
      await props.complete(outcome);
    },
  });
  return (
    <Form
      isLoading={submission.busy}
      navigationTitle="Edit Bookmark"
      actions={
        <ActionPanel>
          {!submission.busy &&
            (submission.pending ? (
              <SubmissionActions
                controller={submission.controller}
                session={session}
                onOutcome={async (outcome) => {
                  setResult(outcome);
                  await props.complete(outcome);
                }}
              />
            ) : (
              <Action.SubmitForm
                title="Save Changes"
                shortcut={getShortcuts().shortcutSave}
                icon={Icon.Checkmark}
                onSubmit={handleSubmit}
              />
            ))}
          {duplicateLinks && (
            <Action
              title="View Existing Bookmark"
              icon={Icon.Bookmark}
              onAction={() => props.onViewExisting(duplicateLinks)}
            />
          )}
          {!submission.busy && !submission.pending && (
            <Action
              title="Reload Bookmark"
              icon={Icon.ArrowClockwise}
              shortcut={getShortcuts().shortcutRefresh}
              onAction={props.reload}
            />
          )}
          <Action
            title="Open in ME Manager"
            shortcut={getShortcuts().shortcutManager}
            icon={Icon.Globe}
            onAction={props.openManager}
          />
          {!submission.busy && !submission.pending && (
            <TrashBookmarkActions
              snapshot={{ entity, session: active }}
              onOutcome={async (outcome) => {
                setResult(outcome);
                await props.complete(outcome);
              }}
            />
          )}
        </ActionPanel>
      }
    >
      {submission.pending && (
        <Form.Description
          title="Previous change"
          text="The original command is kept. Check its result before saving new input."
        />
      )}
      {result && <Form.Description title={outcomeText(result).title} text={outcomeText(result).message} />}
      {!submission.pending && (
        <BookmarkFields
          edit
          identity={
            <>
              <Form.TextField
                {...itemProps.link}
                title="URL"
                placeholder="https://example.com"
                autoFocus
                info="One complete URL. Changing it keeps existing page metadata."
              />
              <Form.TextField {...itemProps.title} title="Title" placeholder="Page title" />
            </>
          }
          itemProps={itemProps}
          collections={props.collections}
          tags={props.tags?.items}
          collectionsError={props.collectionsError}
          tagsError={props.tagsError}
        />
      )}
    </Form>
  );
}
