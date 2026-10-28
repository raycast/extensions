import { Action, ActionPanel, Form, Icon, PopToRootType, showHUD, showInFinder, showToast, Toast } from "@raycast/api";
import { useForm, usePromise } from "@raycast/utils";
import { execFile } from "node:child_process";
import { existsSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { promisify } from "node:util";
import { parseNotes, renderHtml } from "./lib/html";
import { strings } from "./lib/strings";
import { activeSession, recordingUrl, Session, setRecordingUrl } from "./lib/session";

const run = promisify(execFile);

export async function build(session: Session, url: string | undefined): Promise<string> {
  const notes = parseNotes(readFileSync(session.notesPath, "utf8"), session.name);
  writeFileSync(join(session.dir, "index.html"), renderHtml(notes, url));

  // Only frames referenced by notes go into the archive.
  const images = [
    ...new Set(notes.entries.flatMap((entry) => (entry.kind === "note" && entry.image ? [entry.image] : []))),
  ].filter((image) => existsSync(join(session.dir, image)));
  const zipPath = join(dirname(session.dir), `${session.name}.zip`);
  rmSync(zipPath, { force: true });
  await run("/usr/bin/zip", ["-q", "-X", zipPath, "index.html", ...images], { cwd: session.dir });
  return zipPath;
}

export default function Command() {
  const { handleSubmit, itemProps, setValue } = useForm<{ url: string }>({
    initialValues: { url: "" },
    validation: {
      url: (value) => {
        if (!value?.trim()) return;
        try {
          new URL(value.trim());
        } catch {
          return strings.notUrl;
        }
      },
    },
    async onSubmit({ url }) {
      const session = await activeSession();
      const trimmed = url.trim() || undefined;
      if (trimmed) await setRecordingUrl(session, trimmed);
      try {
        const zipPath = await build(session, trimmed);
        await showInFinder(zipPath);
        await showHUD(strings.built(session.name), { popToRootType: PopToRootType.Immediate });
      } catch (buildError) {
        await showToast({ style: Toast.Style.Failure, title: strings.buildFailed, message: String(buildError) });
      }
    },
  });

  const { data, isLoading, error } = usePromise(
    async () => {
      const session = await activeSession();
      return { session, url: (await recordingUrl(session)) ?? "" };
    },
    [],
    { onData: ({ url }) => setValue("url", url) },
  );

  if (error) {
    return (
      <Form>
        <Form.Description title={strings.error} text={error.message} />
      </Form>
    );
  }

  return (
    <Form
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm title={strings.build} icon={Icon.Box} onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.Description title={strings.session} text={data?.session.name ?? "…"} />
      {data && (
        <Form.TextField
          title={strings.recordingUrl}
          placeholder="https://…"
          info={strings.recordingUrlInfo}
          {...itemProps.url}
        />
      )}
    </Form>
  );
}
