import { Tool } from "@raycast/api";

import { createMessage } from "../api/chat";
import { withGoogleAuth } from "../api/google";
import { searchDirectory } from "../api/people";
import { loadMentionMembers, resolveRecipient } from "../api/spaces";
import type { SpaceItem } from "../api/types";
import { messageUrl } from "../helpers/links";
import {
  ALL_USERS,
  applyMentions,
  namesOfTargets,
  renderMentions,
  resolveMentionInputs,
  type MentionTarget,
} from "../helpers/mentions";
import { isEmail, parseRecipient, parseThread } from "../helpers/recipient";
import { personInfo } from "../helpers/dm-names";

type Input = {
  /**
   * Who to send to: a person's email (opens or creates the DM), a space resource name like "spaces/AAAA",
   * a Google Chat link, or the exact title of a space or DM from list-spaces.
   */
  to: string;
  /**
   * The message text. Google Chat formatting: *bold*, _italic_, ~strikethrough~, `code`, and ```code blocks```.
   * To place a mention inside the sentence, write @ and the person's name (e.g. "@Sara can you check?").
   */
  text: string;
  /**
   * Optional thread to reply in: a thread name like "spaces/AAAA/threads/BBBB" (from get-messages) or a message link.
   */
  thread?: string;
  /**
   * Optional people to mention, only in spaces and group chats: each a name or email of a member of that
   * conversation, or "all" for everyone. If the text has "@" followed by their name, the mention goes there;
   * otherwise it's added at the start of the message.
   */
  mentions?: string[];
};

const NO_DM_MENTIONS = "Mentions only work in spaces and group chats, not direct messages";

interface Mentions {
  targets: MentionTarget[];
  /** Final text as sent. */
  text: string;
}

/** Resolves `mentions` against the target space's members and places them in the text. Throws on no or several matches. */
async function resolveMentions(target: SpaceItem, input: Input): Promise<Mentions> {
  const wanted = (input.mentions ?? []).filter((m) => m.trim());
  if (wanted.length === 0) return { targets: [], text: input.text };
  if (target.kind === "dm") throw new Error(NO_DM_MENTIONS);
  const members = await loadMentionMembers(target.space);
  const targets = resolveMentionInputs(wanted, members, target.title);
  return { targets, text: applyMentions(input.text, targets) };
}

function isDirectRecipient(to: string): boolean {
  try {
    const kind = parseRecipient(to).kind;
    return kind === "email" || kind === "user";
  } catch {
    return false;
  }
}

/** Readable recipient for the confirmation, without creating anything. */
async function describeRecipient(to: string): Promise<string> {
  if (isEmail(to)) {
    try {
      const [person] = await searchDirectory(to, 1);
      const info = person ? personInfo(person) : undefined;
      return info?.name ? `${info.name} <${to}>` : to;
    } catch {
      return to;
    }
  }
  try {
    return (await resolveRecipient(to, { createDm: false })).title;
  } catch {
    return to;
  }
}

function describeTargets(targets: MentionTarget[]): string | undefined {
  if (targets.length === 0) return undefined;
  return targets
    .map((t) => (t.user === ALL_USERS ? "@all (everyone in this space)" : `@${t.name ?? t.user}`))
    .join(", ");
}

export const confirmation: Tool.Confirmation<Input> = async (input) => {
  const wantsMentions = (input.mentions ?? []).some((m) => m.trim());
  if (!wantsMentions) {
    return {
      message: `Send this message in Google Chat?`,
      info: [
        { name: "To", value: await describeRecipient(input.to) },
        { name: "Message", value: input.text },
        { name: "Thread", value: input.thread },
      ],
    };
  }
  if (isDirectRecipient(input.to)) throw new Error(NO_DM_MENTIONS);
  const target = await resolveRecipient(input.to, { createDm: false });
  const mentions = await resolveMentions(target, input);
  return {
    message: `Send this message in Google Chat?`,
    info: [
      { name: "To", value: target.title },
      { name: "Mention", value: describeTargets(mentions.targets) },
      { name: "Message", value: renderMentions(mentions.text, namesOfTargets(mentions.targets)) },
      { name: "Thread", value: input.thread },
    ],
  };
};

/** Sends a message to a space, DM or person, with optional @mentions. */
async function sendMessage(input: Input) {
  if (!input.text.trim()) throw new Error("Message text is empty");
  const thread = parseThread(input.thread);
  // Check before resolving, which would create a DM.
  if ((input.mentions ?? []).some((m) => m.trim()) && isDirectRecipient(input.to)) throw new Error(NO_DM_MENTIONS);
  const target = await resolveRecipient(input.to);
  const mentions = await resolveMentions(target, input);
  const sent = await createMessage(target.space.name, mentions.text, thread);
  return {
    sentTo: target.title,
    space: target.space.name,
    message: sent.name,
    thread: sent.thread?.name,
    mentioned: mentions.targets.length > 0 ? mentions.targets.map((t) => t.name ?? t.user) : undefined,
    url: messageUrl(target.space, sent),
  };
}

export default withGoogleAuth(sendMessage);
