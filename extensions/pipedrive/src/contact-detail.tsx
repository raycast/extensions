import { Action, ActionPanel, Detail, Toast, getPreferenceValues, showToast } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { useMemo, useRef } from "react";
import { pathToFileURL } from "url";

import AddContact from "./add-contact";
import { buildPipedriveApiUrl, buildPipedriveWebUrl, fetchPipedriveJson, isAbortError } from "./pipedrive-client";
import { ensurePersonAvatarCached } from "./pipedrive-avatar-cache";
import UploadPersonPhoto from "./upload-person-photo";

type PersonResponse = {
  data?: {
    id: number;
    name?: string;
    job_title?: string;
    org_name?: string;
    org_id?: number | { value?: number | null; name?: string } | null;
    email?: Array<{ value?: string; label?: string }>;
    phone?: Array<{ value?: string; label?: string }>;
    picture_id?: unknown;
  };
};

function extractPicture(input: unknown): { pictureKey: string | null; pictureUrl: string | null } {
  if (!input) return { pictureKey: null, pictureUrl: null };

  if (typeof input === "number") {
    return { pictureKey: String(input), pictureUrl: null };
  }

  if (typeof input !== "object") {
    return { pictureKey: null, pictureUrl: null };
  }

  const anyInput = input as Record<string, unknown>;
  const id = anyInput.id;
  const value = anyInput.value;

  const pictures = anyInput.pictures;
  if (pictures && typeof pictures === "object") {
    const picturesObj = pictures as Record<string, unknown>;
    const url512 = typeof picturesObj["512"] === "string" ? (picturesObj["512"] as string) : null;
    const url128 = typeof picturesObj["128"] === "string" ? (picturesObj["128"] as string) : null;
    const pictureUrl = url512 || url128;

    const key =
      typeof id === "number" || typeof id === "string"
        ? String(id)
        : typeof value === "number" || typeof value === "string"
          ? String(value)
          : pictureUrl;
    return { pictureKey: key ? String(key) : null, pictureUrl: pictureUrl || null };
  }

  return { pictureKey: null, pictureUrl: null };
}

export default function ContactDetail({ id }: { id: string }) {
  const preferences = getPreferenceValues<Preferences.Index>();
  const abortable = useRef<AbortController | null>(null);

  const { data, isLoading, revalidate } = useCachedPromise(
    async (id: string) => {
      const url = buildPipedriveApiUrl(preferences, `/api/v1/persons/${id}`);
      const json = await fetchPipedriveJson<PersonResponse>(preferences, url, {
        method: "get",
        signal: abortable.current?.signal,
      });

      const person = json.data;
      if (!person?.id) {
        return { person: null, avatarPath: null };
      }

      const picture = extractPicture(person.picture_id);
      const avatarPath = await ensurePersonAvatarCached(preferences, id, {
        pictureKey: picture.pictureKey,
        pictureUrl: picture.pictureUrl,
        signal: abortable.current?.signal,
      });

      return { person, avatarPath };
    },
    [id],
    {
      abortable,
      onError: (error) => {
        if (isAbortError(error)) return;
        const message = error instanceof Error ? error.message : String(error);
        void showToast({ style: Toast.Style.Failure, title: "Failed to load contact", message });
      },
    },
  );

  const person = data?.person;

  const markdown = useMemo(() => {
    const name = (person?.name || "").trim() || `Person ${id}`;
    const lines: string[] = [];

    if (data?.avatarPath) {
      const fileUrl = pathToFileURL(data.avatarPath);
      fileUrl.searchParams.set("raycast-width", "220");
      fileUrl.searchParams.set("raycast-height", "220");
      lines.push(`![Photo](${fileUrl.toString()})`);
      lines.push("");
    } else {
      lines.push("No photo");
      lines.push("");
    }

    lines.push(`# ${name}`);

    const job = (person?.job_title || "").trim();
    if (job) {
      lines.push("");
      lines.push(job);
    }

    return lines.join("\n");
  }, [data?.avatarPath, id, person?.job_title, person?.name]);

  const emails = (person?.email || []).map((e) => (e.value || "").trim()).filter(Boolean);
  const phones = (person?.phone || []).map((p) => (p.value || "").trim()).filter(Boolean);

  const itemUrl = buildPipedriveWebUrl(preferences.domain, `/person/${id}`);

  return (
    <Detail
      isLoading={isLoading}
      navigationTitle={(person?.name || "Contact").trim() || "Contact"}
      markdown={markdown}
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            <Action.Push
              title="Edit Contact"
              target={<AddContact key={`edit-contact-${id}`} personIdToEdit={id} onSaved={revalidate} />}
              icon="✏️"
            />
            <Action.OpenInBrowser
              title="Open in Browser"
              url={itemUrl}
              shortcut={{
                macOS: { modifiers: ["cmd", "shift"], key: "enter" },
                Windows: { modifiers: ["ctrl", "shift"], key: "enter" },
              }}
            />
            <Action.Push title="Upload Photo" target={<UploadPersonPhoto personId={id} onUploaded={revalidate} />} />
          </ActionPanel.Section>
        </ActionPanel>
      }
      metadata={
        <Detail.Metadata>
          {emails.length > 0 && <Detail.Metadata.Label title="Email" text={emails[0]} />}
          {phones.length > 0 && <Detail.Metadata.Label title="Phone" text={phones[0]} />}
          {(person?.org_name || "").trim() && (
            <Detail.Metadata.Label title="Organization" text={(person?.org_name || "").trim()} />
          )}
          <Detail.Metadata.Link title="Pipedrive" target={itemUrl} text="Open person" />
        </Detail.Metadata>
      }
    />
  );
}
