type RenameConversation = (args: { channel: string; name: string }) => Promise<{
  ok?: boolean;
  error?: string;
  channel?: { id?: string; name?: string };
}>;

const MAX_CHANNEL_NAME_LENGTH = 80;

const errorMessages: Record<string, string> = {
  channel_not_found: "Slack could not find this channel. Use Get Channels to look up its ID.",
  name_taken: "Another channel already uses this name. Pick a different name.",
  not_authorized: "You are not allowed to rename this channel. Workspace settings may limit renaming to admins.",
  not_in_channel: "You need to be a member of this channel to rename it.",
  is_archived: "This channel is archived and cannot be renamed.",
  method_not_supported_for_channel_type: "This conversation type cannot be renamed. Only channels can be renamed.",
  invalid_name_specials:
    "The name contains characters Slack does not allow. Use lowercase letters, numbers, hyphens, and underscores.",
  invalid_name_punctuation: "The name cannot be only punctuation.",
  invalid_name_maxlength: `The name must be ${MAX_CHANNEL_NAME_LENGTH} characters or fewer.`,
  invalid_name_required: "Provide a new channel name.",
  invalid_name: "Slack rejected this channel name.",
};

export function parseChannelId(channel: string): string {
  const id = channel.trim();
  if (!/^[CG][A-Z0-9]{8,}$/.test(id)) {
    throw new Error(`Invalid Slack channel ID: ${id || "(empty)"}. Use Get Channels to look up the channel ID.`);
  }
  return id;
}

/**
 * Converts a name the way Slack's own rename dialog does: strips a leading #, lowercases, and turns spaces into
 * hyphens. Anything else is left for Slack to validate.
 */
export function normalizeChannelName(name: string): string {
  const normalized = name.trim().replace(/^#+/, "").trim().toLowerCase().replace(/\s+/g, "-");
  if (!normalized) {
    throw new Error("Provide a new channel name");
  }
  if (normalized.length > MAX_CHANNEL_NAME_LENGTH) {
    throw new Error(`Channel names must be ${MAX_CHANNEL_NAME_LENGTH} characters or fewer`);
  }
  return normalized;
}

function describeSlackError(code: string): string {
  return errorMessages[code] ? `${errorMessages[code]} (${code})` : code;
}

export async function renameChannel(channel: string, name: string, renameConversation: RenameConversation) {
  const id = parseChannelId(channel);
  const newName = normalizeChannelName(name);

  let response: Awaited<ReturnType<RenameConversation>>;
  try {
    response = await renameConversation({ channel: id, name: newName });
  } catch (error) {
    const code = (error as { data?: { error?: string } }).data?.error;
    if (code) throw new Error(describeSlackError(code));
    throw error;
  }

  if (response.error || response.ok === false) {
    throw new Error(describeSlackError(response.error ?? "Slack could not rename the channel"));
  }

  return { channel: response.channel?.id ?? id, name: response.channel?.name ?? newName };
}
