import { execa } from "execa";
import { z } from "zod";
import { Envelope, Flags, Folder } from "./models";

// Himalaya v2 renamed `folder` to `mailbox`, replaced `--output json` with `--json`
// and changed the JSON it prints, so commands and output depend on the installed version.

const majorVersions = new Map<string, Promise<number>>();

/** The major version of the Himalaya CLI at `binaryPath`, read once from `--version`. */
export function getMajorVersion(binaryPath: string): Promise<number> {
  let version = majorVersions.get(binaryPath);
  if (!version) {
    version = execa(binaryPath, ["--version"]).then(
      (result) => parseMajorVersion(result.stdout),
      () => 1,
    );
    majorVersions.set(binaryPath, version);
  }
  return version;
}

export function parseMajorVersion(output: string): number {
  const match = output.match(/himalaya v?(\d+)\./i);
  return match ? Number(match[1]) : 1;
}

export function envelopeListArgs(major: number, account: string, pageSize: number, folder?: string): string[] {
  if (major >= 2) {
    return [
      "envelope",
      "list",
      "--account",
      account,
      "--json",
      "--page-size",
      `${pageSize}`,
      "--has-attachment",
    ].concat(folder ? ["--mailbox", folder] : []);
  }
  return ["envelope", "list", "--account", account, "--output", "json", "--page-size", `${pageSize}`].concat(
    folder ? ["--folder", folder] : [],
  );
}

export function folderListArgs(major: number, account: string): string[] {
  return major >= 2
    ? ["mailbox", "list", "--account", account, "--json"]
    : ["folder", "list", "--account", account, "--output", "json"];
}

export function messageDeleteArgs(major: number, account: string, id: string, sourceFolder?: string): string[] {
  if (major >= 2) {
    return ["message", "delete", id, "--account", account, "--json"].concat(
      sourceFolder ? ["--mailbox", sourceFolder] : [],
    );
  }
  return ["message", "delete", id, "--account", account, "--output", "json"];
}

export function messageMoveArgs(
  major: number,
  account: string,
  id: string,
  targetFolder: string,
  sourceFolder?: string,
): string[] {
  if (major >= 2) {
    return ["message", "move", "--to", targetFolder, id, "--account", account, "--json"].concat(
      sourceFolder ? ["--from", sourceFolder] : [],
    );
  }
  return ["message", "move", targetFolder, id, "--account", account, "--output", "json"];
}

export function messageReadArgs(major: number, account: string, id: string, sourceFolder?: string): string[] {
  // v2 has no `--no-headers`, so read the JSON and take the text parts from it
  if (major >= 2) {
    return ["message", "read", id, "--account", account, "--json"].concat(
      sourceFolder ? ["--mailbox", sourceFolder] : [],
    );
  }
  return ["message", "read", "--no-headers", id, "--account", account];
}

const V2Message = z.object({
  text_body: z.array(z.number()).default([]),
  html_body: z.array(z.number()).default([]),
  parts: z.array(z.object({ body: z.unknown() })).default([]),
});

/** The body of `message read` output: v2 prints JSON, where `text_body` and `html_body` index the decoded parts. */
export function readMessageBody(major: number, stdout: string): string {
  if (major < 2) return stdout;
  const message = V2Message.parse(JSON.parse(stdout));
  const contents = (indexes: number[], kind: "Text" | "Html") =>
    indexes.flatMap((index) => {
      const body = message.parts[index]?.body;
      const content = body && typeof body === "object" ? (body as Record<string, unknown>)[kind] : undefined;
      return typeof content === "string" ? [content] : [];
    });
  const text = contents(message.text_body, "Text");
  return (text.length > 0 ? text : contents(message.html_body, "Html")).join("\n\n");
}

const V2Address = z.object({
  name: z.string().nullable().optional(),
  email: z.string().nullable().optional(),
});

const V2Envelope = z.object({
  id: z.string(),
  flags: z
    .array(z.object({ raw: z.string(), iana: z.string().nullable().optional() }))
    .nullable()
    .optional(),
  subject: z.string().nullable().optional(),
  from: z.array(V2Address).nullable().optional(),
  to: z.array(V2Address).nullable().optional(),
  date: z.string().nullable().optional(),
  "has-attachment": z.boolean().nullable().optional(),
});

const V2Mailbox = z.object({
  name: z.string(),
  role: z.string().nullable().optional(),
});

const ianaFlags: Record<string, Flags> = {
  seen: Flags.Seen,
  answered: Flags.Answered,
  flagged: Flags.Flagged,
  deleted: Flags.Deleted,
  draft: Flags.Draft,
  recent: Flags.Recent,
};

/** `2026-11-04T10:15:00+01:00` (v2) as `2026-11-04 10:15+01:00` (v1), the format the Envelope model expects. */
export function toV1Date(date: string | null | undefined): string | null {
  const match = date?.match(/^(\d{4}-\d{2}-\d{2})T(\d{2}:\d{2})(?::\d{2}(?:\.\d+)?)?(Z|[+-]\d{2}:\d{2})$/);
  if (!match) return null;
  return `${match[1]} ${match[2]}${match[3] === "Z" ? "+00:00" : match[3]}`;
}

function toV1Address(addresses: z.infer<typeof V2Address>[] | null | undefined) {
  const first = addresses?.[0];
  return first ? { name: first.name ?? null, addr: first.email ?? null } : null;
}

/** Envelopes from `envelope list` JSON, in the v1 shape for both versions. */
export function parseEnvelopes(major: number, data: unknown): Envelope[] {
  if (major < 2) return z.array(Envelope).parse(data);
  const { envelopes } = z.object({ envelopes: z.array(V2Envelope) }).parse(data);
  return envelopes.map((envelope) =>
    Envelope.parse({
      id: envelope.id,
      flags: (envelope.flags ?? []).flatMap((flag) => {
        const known = flag.iana ? ianaFlags[flag.iana.toLowerCase()] : undefined;
        return known ? [known] : [];
      }),
      subject: envelope.subject ?? "",
      from: toV1Address(envelope.from),
      to: toV1Address(envelope.to),
      date: toV1Date(envelope.date),
      has_attachment: envelope["has-attachment"] ?? false,
    }),
  );
}

/** Folders from `folder list` (v1) or `mailbox list` (v2) JSON; a v2 role becomes a v1 style `\Role` description. */
export function parseFolders(major: number, data: unknown): Folder[] {
  if (major < 2) return z.array(Folder).parse(data);
  const { mailboxes } = z.object({ mailboxes: z.array(V2Mailbox) }).parse(data);
  return mailboxes.map((mailbox) => ({
    name: mailbox.name,
    desc: mailbox.role ? `\\${mailbox.role.charAt(0).toUpperCase()}${mailbox.role.slice(1)}` : "",
  }));
}
