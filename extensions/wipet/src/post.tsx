import {
  Action,
  ActionPanel,
  Form,
  Icon,
  List,
  Toast,
  closeMainWindow,
  popToRoot,
  showToast,
  useNavigation,
} from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { basename } from "node:path";
import { useEffect, useMemo, useRef, useState } from "react";
import { createProject, createTodo, listProjects, type Project } from "./lib/api";
import { MAX_IMAGES, inspectFile, uploadFiles, type LocalImage } from "./lib/upload";

// Detect a trailing `#word` token at the end of the search bar — that's what
// the user is "currently typing". Cursor position isn't exposed in List, so we
// only trigger when the partial extends to the end of the string.
function detectTailHashtag(text: string): { start: number; query: string } | null {
  const m = text.match(/(?:^|\s)(#\w*)$/);
  if (!m) return null;
  const tag = m[1];
  return { start: text.length - tag.length, query: tag.slice(1).toLowerCase() };
}

function AttachForm({ slotsRemaining, onPick }: { slotsRemaining: number; onPick: (files: LocalImage[]) => void }) {
  const { pop } = useNavigation();
  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Attach"
            icon={Icon.Paperclip}
            onSubmit={async (values: { files: string[] }) => {
              const paths = (values.files ?? []).slice(0, slotsRemaining);
              if (paths.length === 0) {
                pop();
                return;
              }
              try {
                const inspected = await Promise.all(paths.map(inspectFile));
                onPick(inspected);
                pop();
              } catch (err) {
                await showFailureToast(err, { title: "Couldn't attach" });
              }
            }}
          />
        </ActionPanel>
      }
    >
      <Form.FilePicker
        id="files"
        title="Images"
        info={`Up to ${slotsRemaining} more (JPEG, PNG, WebP, GIF · max 10MB each)`}
        allowMultipleSelection
        canChooseDirectories={false}
      />
    </Form>
  );
}

export default function Command() {
  const [searchText, setSearchText] = useState("");
  const [projects, setProjects] = useState<Project[]>([]);
  const [images, setImages] = useState<LocalImage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const isSubmittingRef = useRef(false);

  useEffect(() => {
    let cancelled = false;
    listProjects()
      .then((rows) => {
        if (!cancelled) setProjects(rows);
      })
      .catch(async (err) => {
        await showFailureToast(err, { title: "Couldn't load projects" });
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const tail = detectTailHashtag(searchText);
  const matches = useMemo(() => {
    if (!tail) return [];
    return projects.filter((p) => p.slug.startsWith(tail.query)).slice(0, 8);
  }, [tail?.query, projects]);

  const canCreate =
    tail !== null && tail.query.length > 0 && /^\w+$/.test(tail.query) && !projects.some((p) => p.slug === tail.query);

  function pickProject(slug: string) {
    if (!tail) return;
    const before = searchText.slice(0, tail.start);
    setSearchText(`${before}#${slug} `);
  }

  async function createAndPick(slug: string) {
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: `Creating #${slug}…`,
    });
    try {
      const proj = await createProject(slug);
      setProjects((prev) =>
        prev.some((p) => p.slug === proj.slug) ? prev : [...prev, proj].sort((a, b) => a.slug.localeCompare(b.slug)),
      );
      pickProject(proj.slug);
      toast.style = Toast.Style.Success;
      toast.title = `Created #${proj.slug}`;
    } catch (err) {
      toast.style = Toast.Style.Failure;
      toast.title = "Couldn't create project";
      toast.message = err instanceof Error ? err.message : String(err);
    }
  }

  function addImages(picked: LocalImage[]) {
    setImages((prev) => [...prev, ...picked].slice(0, MAX_IMAGES));
  }

  function removeImage(path: string) {
    setImages((prev) => prev.filter((i) => i.path !== path));
  }

  async function submit(done: boolean) {
    if (isSubmittingRef.current) return;

    const text = searchText.trim();
    if (!text) {
      await showFailureToast("Empty entry", { title: "Empty entry" });
      return;
    }

    isSubmittingRef.current = true;
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: images.length > 0 ? "Uploading images…" : done ? "Shipping…" : "Adding todo…",
    });
    try {
      const uploaded = await uploadFiles(images);
      if (images.length > 0) {
        toast.title = done ? "Shipping…" : "Adding todo…";
      }
      const result = await createTodo({ text, done, images: uploaded });
      toast.style = Toast.Style.Success;
      toast.title = done ? "Shipped" : "Added";
      const parts: string[] = [];
      if (result.projectSlugs.length > 0) parts.push(result.projectSlugs.map((s) => `#${s}`).join(" "));
      if (uploaded.length > 0) parts.push(`${uploaded.length} image${uploaded.length === 1 ? "" : "s"}`);
      toast.message = parts.join(" · ") || undefined;
      await closeMainWindow();
      await popToRoot();
    } catch (err) {
      toast.style = Toast.Style.Failure;
      toast.title = "Failed";
      toast.message = err instanceof Error ? err.message : String(err);
    } finally {
      isSubmittingRef.current = false;
    }
  }

  const slotsRemaining = MAX_IMAGES - images.length;

  const attachAction = slotsRemaining > 0 && (
    <Action.Push
      title="Attach Images"
      icon={Icon.Paperclip}
      shortcut={{ modifiers: ["cmd"], key: "i" }}
      target={<AttachForm slotsRemaining={slotsRemaining} onPick={addImages} />}
    />
  );

  const postSubmitActions = (
    <>
      <Action
        title="Post as Done"
        icon={Icon.Checkmark}
        shortcut={{ modifiers: ["cmd"], key: "return" }}
        onAction={() => submit(true)}
      />
      <Action
        title="Post as Todo"
        icon={Icon.Circle}
        shortcut={{ modifiers: ["cmd", "shift"], key: "return" }}
        onAction={() => submit(false)}
      />
    </>
  );

  const trimmed = searchText.trim();
  const showProjectsSection = tail !== null && (matches.length > 0 || canCreate);

  return (
    <List
      isLoading={isLoading}
      filtering={false}
      searchText={searchText}
      onSearchTextChange={setSearchText}
      searchBarPlaceholder="What did you ship? Type # to tag a project."
    >
      {showProjectsSection ? (
        <List.Section title={`Projects matching “${tail!.query || "…"}”`}>
          {matches.map((p) => (
            <List.Item
              key={p.slug}
              title={`#${p.slug}`}
              subtitle={p.name && p.name.toLowerCase() !== p.slug ? p.name : undefined}
              icon={p.icon ? { source: p.icon } : Icon.Hashtag}
              actions={
                <ActionPanel>
                  <Action title={`Insert #${p.slug}`} icon={Icon.Plus} onAction={() => pickProject(p.slug)} />
                  {postSubmitActions}
                  {attachAction}
                </ActionPanel>
              }
            />
          ))}
          {canCreate && (
            <List.Item
              key="__create"
              title={`Create #${tail!.query}`}
              subtitle="New project"
              icon={Icon.PlusCircle}
              actions={
                <ActionPanel>
                  <Action
                    title={`Create #${tail!.query}`}
                    icon={Icon.PlusCircle}
                    onAction={() => createAndPick(tail!.query)}
                  />
                </ActionPanel>
              }
            />
          )}
        </List.Section>
      ) : (
        <>
          {images.length > 0 && (
            <List.Section title={`Attached (${images.length}/${MAX_IMAGES})`}>
              {images.map((img) => (
                <List.Item
                  key={img.path}
                  title={basename(img.path)}
                  subtitle={`${(img.sizeBytes / 1024).toFixed(0)} KB · ${img.mimeType}`}
                  icon={{ fileIcon: img.path }}
                  actions={
                    <ActionPanel>
                      <Action
                        title="Remove"
                        icon={Icon.Trash}
                        style={Action.Style.Destructive}
                        onAction={() => removeImage(img.path)}
                      />
                      {postSubmitActions}
                      {attachAction}
                    </ActionPanel>
                  }
                />
              ))}
            </List.Section>
          )}
          {trimmed.length > 0 ? (
            <List.Section title="Post">
              <List.Item
                title="Ship it"
                subtitle={trimmed}
                icon={Icon.Checkmark}
                actions={
                  <ActionPanel>
                    <Action title="Post as Done" icon={Icon.Checkmark} onAction={() => submit(true)} />
                    <Action
                      title="Post as Todo"
                      icon={Icon.Circle}
                      shortcut={{ modifiers: ["cmd", "shift"], key: "return" }}
                      onAction={() => submit(false)}
                    />
                    {attachAction}
                  </ActionPanel>
                }
              />
              <List.Item
                title="Add as todo"
                subtitle={trimmed}
                icon={Icon.Circle}
                actions={
                  <ActionPanel>
                    <Action title="Post as Todo" icon={Icon.Circle} onAction={() => submit(false)} />
                    <Action
                      title="Post as Done"
                      icon={Icon.Checkmark}
                      shortcut={{ modifiers: ["cmd"], key: "return" }}
                      onAction={() => submit(true)}
                    />
                    {attachAction}
                  </ActionPanel>
                }
              />
            </List.Section>
          ) : images.length === 0 ? (
            <List.EmptyView
              title="What did you ship?"
              description="Type a message. Use # to tag a project. ⌘I to attach images."
              actions={attachAction ? <ActionPanel>{attachAction}</ActionPanel> : undefined}
            />
          ) : null}
        </>
      )}
    </List>
  );
}
