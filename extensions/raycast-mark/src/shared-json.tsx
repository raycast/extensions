import * as fs from "node:fs/promises";
import path from "node:path";
import { useEffect, useState } from "react";
import {
  Action,
  ActionPanel,
  Alert,
  confirmAlert,
  Form,
  Icon,
  Toast,
  showToast,
  useNavigation,
} from "@raycast/api";
import type { LibraryState, Mutation } from "./model.ts";
import {
  bookmarkMutation,
  canonical,
  catalogMutation,
  TRASH_LOCATION,
} from "./model.ts";
import { readLibrary } from "./repository.ts";
import {
  applyJsonImport,
  exportPortableJson,
  previewJsonImport,
} from "./import-export.ts";
import type { ImportPlan } from "./import-export.ts";
import {
  readSharedJson,
  setSharedJsonSource,
  sharedJsonBaseline,
  sharedJsonDigest,
  sharedJsonPath,
  updateSharedJsonBaseline,
  withExternalSharedJson,
} from "./shared-json-storage.ts";

function authoritativePlan(plan: ImportPlan, state: LibraryState): ImportPlan {
  const incomingIds = new Set(
    plan.data.bookmarks.map((bookmark) => bookmark.id),
  );
  const mutations: Mutation[] = plan.mutations.filter(
    (mutation) => mutation.entity !== "catalog",
  );
  const incomingCatalog = {
    id: "catalog" as const,
    groups: plan.data.catalog.groups,
  };
  if (canonical(incomingCatalog) !== canonical(state.catalog))
    mutations.push(catalogMutation(state, incomingCatalog));
  for (const bookmark of state.bookmarks) {
    if (incomingIds.has(bookmark.id)) continue;
    const deleted = {
      ...bookmark,
      isDeleted: true,
      locations: [TRASH_LOCATION],
      prevLocations: undefined,
      updatedAt: Date.now(),
    };
    if (
      !bookmark.isDeleted ||
      canonical(bookmark.locations) !== canonical(deleted.locations)
    )
      mutations.push(bookmarkMutation(state, deleted));
  }
  return { ...plan, mutations };
}

export default function SharedJsonForm({
  root,
  state,
  onSaved,
}: {
  root: string;
  state: LibraryState;
  onSaved: (state: LibraryState) => void;
}) {
  const { pop } = useNavigation();
  const [connectedPath, setConnectedPath] = useState("");
  useEffect(() => {
    void sharedJsonPath().then(setConnectedPath);
  }, []);
  async function connect(file: string) {
    const raw = await readSharedJson(file);
    const plan = previewJsonImport(raw, state);
    const incomingIds = new Set(
      plan.data.bookmarks.map((bookmark) => bookmark.id),
    );
    const missingLocally = state.bookmarks.filter(
      (bookmark) => !incomingIds.has(bookmark.id),
    ).length;
    const differenceCount = plan.differences.length + missingLocally;
    const accepted = await confirmAlert({
      title: differenceCount
        ? `Local library differs from file (${differenceCount} items)`
        : "Connect shared file?",
      message: `Validated JSON: ${plan.counts.bookmarks} bookmarks, ${plan.counts.groups} groups. ${differenceCount ? "Continuing updates the local library from this file. To keep local content, cancel and export a backup from Settings & Data first." : "The file matches the current library."}

The original events directory will not be deleted.
${file}`,
      primaryAction: {
        title: "Use This File",
        style: Alert.ActionStyle.Destructive,
      },
    });
    if (!accepted) return;
    const chosen = authoritativePlan(plan, state);
    const decisions = Object.fromEntries(
      plan.differences.map((difference) => [
        difference.entityKey,
        "incoming" as const,
      ]),
    );
    const result = await withExternalSharedJson(async () => {
      if (
        raw !== (await readSharedJson(file)) ||
        canonical(state) !== canonical(await readLibrary(root))
      )
        throw new Error("Data changed; reopen the form or preview");
      const imported = chosen.mutations.length
        ? await applyJsonImport(root, chosen, decisions)
        : { state };
      const local = await exportPortableJson(root, imported.state);
      await setSharedJsonSource(file, raw, local);
      return imported;
    });
    onSaved(result.state);
    await showToast({
      style: Toast.Style.Success,
      title: "Shared JSON connected",
    });
    pop();
  }

  async function create(values: Form.Values) {
    const directory = (values.directory as string[] | undefined)?.[0];
    const name =
      typeof values.filename === "string" ? values.filename.trim() : "";
    if (
      !directory ||
      !/^[^/\\]+\.json$/i.test(name) ||
      name === "." ||
      name === ".." ||
      name.includes("\0")
    )
      throw new Error("Choose a directory and enter a valid .json filename");
    return withExternalSharedJson(async () => {
      const target = path.join(directory, name);
      const raw = await exportPortableJson(root, await readLibrary(root));
      let handle: Awaited<ReturnType<typeof fs.open>> | undefined;
      let created = false;
      let owned: { dev: number; ino: number } | undefined;
      try {
        handle = await fs.open(target, "wx", 0o600);
        created = true;
        owned = await handle.stat();
        await handle.writeFile(raw, "utf8");
        await handle.sync();
      } catch (error) {
        await handle?.close().catch(() => undefined);
        handle = undefined;
        let cleanupFailed = false;
        if (created && owned) {
          const current = await fs.lstat(target).catch(() => undefined);
          if (
            current?.isFile() &&
            !current.isSymbolicLink() &&
            current.dev === owned.dev &&
            current.ino === owned.ino
          ) {
            try {
              await fs.unlink(target);
            } catch {
              cleanupFailed = true;
            }
          }
        }
        if (cleanupFailed)
          throw new Error(
            `Writing and cleaning up the new file failed; check manually: ${target}`,
          );
        throw error;
      } finally {
        await handle?.close().catch(() => undefined);
      }
      await setSharedJsonSource(target, raw, raw);
      await showToast({
        style: Toast.Style.Success,
        title: "Shared JSON created",
      });
      pop();
    });
  }

  return (
    <Form
      navigationTitle="Shared JSON Source"
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Use Existing JSON File"
            icon={Icon.Link}
            onSubmit={async (values) => {
              const file = (values.existing as string[] | undefined)?.[0];
              if (!file) {
                await showToast({
                  style: Toast.Style.Failure,
                  title: "Select a JSON file",
                });
                return;
              }
              try {
                await connect(file);
              } catch (error) {
                await showToast({
                  style: Toast.Style.Failure,
                  title: "Connection failed; file not overwritten",
                  message:
                    error instanceof Error ? error.message : "Invalid file",
                });
              }
            }}
          />
          <Action.SubmitForm
            title="Create JSON and Initialize Local Library"
            icon={Icon.Plus}
            onSubmit={async (values) => {
              try {
                await create(values);
              } catch (error) {
                await showToast({
                  style: Toast.Style.Failure,
                  title: "Creation failed; file not overwritten",
                  message:
                    error instanceof Error ? error.message : "Invalid file",
                });
              }
            }}
          />
        </ActionPanel>
      }
    >
      <Form.Description
        title="Existing JSON"
        text={`A valid file becomes the authoritative source after confirmation. Writes are blocked if it is corrupt, missing, or conflicted.${connectedPath ? ` Connected: ${connectedPath}` : " Not connected."}`}
      />
      <Form.FilePicker
        id="existing"
        title="Choose JSON File"
        canChooseDirectories={false}
        canChooseFiles
        allowMultipleSelection={false}
      />
      <Form.Separator />
      <Form.Description
        title="New JSON"
        text="Created only when the destination does not exist. Initialized from the local library, with icons embedded in JSON. You may choose an iCloud Drive directory."
      />
      <Form.FilePicker
        id="directory"
        title="Save Directory"
        canChooseDirectories
        canChooseFiles={false}
        allowMultipleSelection={false}
      />
      <Form.TextField
        id="filename"
        title="Filename"
        defaultValue="goose-marks.json"
      />
    </Form>
  );
}

export async function refreshSharedJson(root: string, state: LibraryState) {
  return withExternalSharedJson(async () => {
    const file = await sharedJsonPath();
    if (!file) return state;
    const current = await readLibrary(root);
    const raw = await readSharedJson(file);
    const baseline = await sharedJsonBaseline();
    if (!baseline.remote || !baseline.local)
      throw new Error(
        "Shared JSON baseline missing; reconnect the file to avoid overwriting data",
      );
    const local = await exportPortableJson(root, current);
    if (sharedJsonDigest(raw) === baseline.remote) {
      if (sharedJsonDigest(local) !== baseline.local)
        throw new Error(
          "Local changes are not yet in shared JSON; export a backup, then reconnect the file",
        );
      return canonical(current) === canonical(state) ? state : current;
    }
    if (sharedJsonDigest(local) !== baseline.local)
      throw new Error(
        "Both shared file and local library changed; sync and writes are blocked due to conflict",
      );
    const plan = previewJsonImport(raw, current);
    const chosen = authoritativePlan(plan, current);
    const decisions = Object.fromEntries(
      plan.differences.map((difference) => [
        difference.entityKey,
        "incoming" as const,
      ]),
    );
    const result = chosen.mutations.length
      ? await applyJsonImport(root, chosen, decisions)
      : { state: current };
    const nextLocal = await exportPortableJson(root, result.state);
    await updateSharedJsonBaseline(raw, nextLocal);
    return result.state;
  });
}
