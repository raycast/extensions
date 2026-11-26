/**
 * The list's detail pane for one chat: a glance at the match with the message
 * before and after it, read with `mash view`, above what Mash said about the
 * chat. Only the selected row mounts this, so only its chat is read; Raycast
 * keeps each answer, so going back to a row shows it at once.
 */
import { environment, Icon, List } from "@raycast/api";
import { useExec } from "@raycast/utils";
import { agentIcon } from "./agentIcon";
import { glanceMarkdown, queryTerms, speakerPicture } from "./glance";
import {
  agentName,
  type ChatPosition,
  chatPosition,
  glance,
  type Hit,
  lastActive,
  literal,
  mashEnvironment,
  messageCount,
  parseView,
  viewArguments,
} from "./mash";
import { read } from "./run";

/** A glance at `hit`'s chat; `query` is what was searched for, marked in the match. */
export function ChatGlance({ hit, mash, query }: { hit: Hit; mash: string; query: string }) {
  const { data, isLoading, error } = useExec(mash, viewArguments(hit), {
    env: mashEnvironment(),
    parseOutput: read(parseView),
    // The pane says what went wrong; a toast for every row passed over would not help.
    onError: () => undefined,
  });
  const view = data ?? { messages: [] };
  const glimpses = glance(view.messages, hit.messageId);
  const dark = environment.appearance === "dark";
  const markdown = error
    ? `**Mash couldn’t read this chat.**\n\n${literal(error.message)}`
    : glanceMarkdown(glimpses, {
        agent: hit.agent,
        matched: hit.matched,
        terms: queryTerms(query),
        picture: (who) => speakerPicture(who, environment.assetsPath, dark),
      });
  return (
    <List.Item.Detail
      isLoading={isLoading}
      markdown={markdown}
      metadata={<ChatFacts hit={hit} position={chatPosition(view, glimpses)} />}
    />
  );
}

/**
 * What Mash said about a chat, under its glance: its agent, project, machine,
 * last activity and message count. A row Mash gave no agent, project or time
 * for leaves those out rather than guessing.
 */
export function ChatFacts({ hit, position = {} }: { hit: Hit; position?: ChatPosition }) {
  const count = messageCount(position);
  const { Label } = List.Item.Detail.Metadata;
  return (
    <List.Item.Detail.Metadata>
      {hit.agent ? <Label title="Agent" text={agentName(hit.agent)} icon={agentIcon(hit.agent)} /> : null}
      {hit.project ? <Label title="Project" text={hit.project} icon={Icon.Folder} /> : null}
      {/* Mash names another machine's chats by that machine; the rest are this one's. */}
      <Label title="Machine" text={hit.machine ?? "This machine"} icon={Icon.Monitor} />
      {hit.updatedAt ? (
        <Label title="Last active" text={lastActive(hit.updatedAt, new Date())} icon={Icon.Clock} />
      ) : null}
      {count ? <Label title="Messages" text={count} icon={Icon.Bubble} /> : null}
    </List.Item.Detail.Metadata>
  );
}
