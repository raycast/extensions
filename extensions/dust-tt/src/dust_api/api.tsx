import fetch from "node-fetch";
import { createParser } from "eventsource-parser";
import { ConversationType, UserMessageType } from "./conversation";
import { AgentConfigurationType } from "./agent";
import { MANAGED_SOURCES } from "../agents";
import {
  AgentActionSuccessEvent,
  AgentActionType,
  AgentErrorEvent,
  AgentMessageSuccessEvent,
  DustAPIErrorResponse,
  DustDocument,
  GenerationTokensEvent,
  RetrievalDocumentType,
  UserMessageErrorEvent,
} from "./conversation_events";

const DUST_API_URL = "https://dust.tt/api/v1/w";

function removeCiteMention(message: string) {
  const regex = / ?:cite\[[a-zA-Z0-9, ]+\]/g;
  return message.replace(regex, "");
}

export type DustAPICredentials = {
  apiKey: string;
  workspaceId: string;
};

export class DustApi {
  _credentials: DustAPICredentials;
  _conversationApiUrl: string;

  /**
   * @param credentials DustAPICrededentials
   */
  constructor(credentials: DustAPICredentials) {
    this._credentials = credentials;
    this._conversationApiUrl = `${DUST_API_URL}/${credentials.workspaceId}/assistant/conversations`;
  }

  async createConversation({ question, agentId = "dust" }: { question: string; agentId?: string }): Promise<{
    conversation?: ConversationType;
    message?: UserMessageType;
    error?: string;
  }> {
    const { apiKey } = this._credentials;
    const response = await fetch(this._conversationApiUrl, {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      method: "POST",
      body: JSON.stringify({
        visibility: "unlisted",
        title: null,
        message: {
          content: question,
          mentions: [
            {
              configurationId: agentId,
            },
          ],
          context: {
            timezone: "Europe/Paris",
            username: "raycast",
            email: null,
            fullName: "Raycast",
            profilePictureUrl: "https://dust.tt/static/systemavatar/helper_avatar_full.png",
          },
        },
      }),
    });
    const json = (await response.json()) as {
      conversation?: ConversationType;
      message?: UserMessageType;
      error?: DustAPIErrorResponse;
    };
    if (json.error) {
      return { error: json.error.message };
    }
    return json as { conversation: ConversationType; message: UserMessageType };
  }

  async streamAgentMessageEvents({ conversationId, messageId }: { conversationId: string; messageId: string }) {
    const { apiKey } = this._credentials;

    const res = await fetch(`${this._conversationApiUrl}/${conversationId}/messages/${messageId}/events`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
    });

    if (!res.ok || !res.body) {
      console.error(`Error running streamed app: status_code=${res.status}  - message=${await res.text()}`);
      return null;
    }

    const pendingEvents: (
      | UserMessageErrorEvent
      | AgentErrorEvent
      | AgentActionSuccessEvent
      | GenerationTokensEvent
      | AgentMessageSuccessEvent
    )[] = [];
    const parser = createParser((event) => {
      if (event.type === "event") {
        if (event.data) {
          try {
            const data = JSON.parse(event.data).data;
            pendingEvents.push(data);
          } catch (err) {
            console.error("Failed parsing chunk from Dust API", err);
          }
        }
      }
    });

    const reader = res.body;

    const streamEvents = async function* () {
      let done = false;
      reader.on("end", () => {
        done = true;
      });
      reader.on("readable", () => {
        let chunk;
        while (null !== (chunk = reader.read())) {
          if (typeof chunk === "string") {
            parser.feed(chunk);
          } else {
            parser.feed(new TextDecoder().decode(chunk));
          }
        }
      });
      reader.on("error", (err) => {
        console.error("Error reading stream", err);
      });
      while (!done) {
        if (pendingEvents.length > 0) {
          yield pendingEvents.shift(); // Yields the next event
        } else {
          // Wait for the next 'readable' event or end of the stream
          await new Promise((resolve) => reader.once("readable", resolve));
        }
      }
    };

    return { eventStream: streamEvents() };
  }

  async streamAnswer({
    conversation,
    message,
    setDustAnswer,
    onDone,
    setDustDocuments,
  }: {
    conversation: ConversationType;
    message: UserMessageType;
    setDustAnswer: (answer: string) => void;
    onDone?: (answer: string) => void;
    setDustDocuments: (documents: DustDocument[]) => void;
  }) {
    {
      const conversationId = conversation.sId;
      const agentMessages = conversation.content
        .map((versions) => {
          const m = versions[versions.length - 1];
          return m;
        })
        .filter((m) => {
          return m && m.type === "agent_message" && m.parentMessageId === message?.sId;
        });
      if (agentMessages.length === 0) {
        console.error("Failed to retrieve agent message");
      }
      const agentMessage = agentMessages[0];
      const streamRes = await this.streamAgentMessageEvents({
        conversationId,
        messageId: agentMessage.sId,
      });
      if (!streamRes) {
        return;
      }
      let answer = "";
      let lastSentDate = new Date();
      let action: AgentActionType | undefined = undefined;
      for await (const event of streamRes.eventStream) {
        if (!event) {
          continue;
        }
        switch (event.type) {
          case "user_message_error": {
            console.error(`User message error: code: ${event.error.code} message: ${event.error.message}`);
            return;
          }
          case "agent_error": {
            console.error(`Agent message error: code: ${event.error.code} message: ${event.error.message}`);
            return;
          }
          case "agent_action_success": {
            action = event.action;
            break;
          }
          case "generation_tokens": {
            if (event.classification !== "tokens") {
              continue;
            }
            answer += event.text;
            if (lastSentDate.getTime() + 500 > new Date().getTime()) {
              continue;
            }
            const dustAnswer = this.processAction({ content: answer, action, setDustDocuments });
            lastSentDate = new Date();
            setDustAnswer(dustAnswer + "...");
            break;
          }
          case "agent_message_success": {
            answer = this.processAction({ content: event.message.content ?? "", action, setDustDocuments });
            setDustAnswer(answer);
            if (onDone) {
              onDone(answer);
            }
            return;
          }
          default:
          // Nothing to do on unsupported events
        }
      }
    }
  }

  processAction({
    content,
    action,
    setDustDocuments,
  }: {
    content: string;
    action?: AgentActionType;
    setDustDocuments: (documents: DustDocument[]) => void;
  }): string {
    const references: { [key: string]: RetrievalDocumentType } = {};
    if (action && action.type === "retrieval_action" && action.documents) {
      action.documents.forEach((d) => {
        references[d.reference] = d;
      });
    }
    const documents: DustDocument[] = [];
    if (references) {
      let counter = 0;
      const refCounter: { [key: string]: number } = {};
      const contentWithLinks = content.replace(/:cite\[[a-zA-Z0-9, ]+\]/g, (match) => {
        const keys = match.slice(6, -1).split(","); // slice off ":cite[" and "]" then split by comma
        return keys
          .map((key) => {
            const k = key.trim();
            const ref = references[k];
            if (ref) {
              let newDoc = false;
              if (!refCounter[k]) {
                counter++;
                refCounter[k] = counter;
                newDoc = true;
              }
              const link = ref.sourceUrl
                ? ref.sourceUrl
                : `${DUST_API_URL}/${ref.dataSourceWorkspaceId}/builder/data-sources/${
                    ref.dataSourceId
                  }/upsert?documentId=${encodeURIComponent(ref.documentId)}`;
              if (newDoc) {
                documents.push({
                  id: ref.documentId,
                  sourceUrl: link,
                  dataSourceId: ref.dataSourceId,
                  score: ref.score,
                  reference: refCounter[k],
                });
              }
              const icon = ref.dataSourceId in MANAGED_SOURCES ? MANAGED_SOURCES[ref.dataSourceId].icon : undefined;
              const markdownIcon = icon ? `<img src="${icon}" width="16" height="16"> ` : "";
              return `[${markdownIcon}[${refCounter[k]}](${link})]`;
            }
            return "";
          })
          .join("");
      });
      setDustDocuments(documents);
      return contentWithLinks;
    }
    return removeCiteMention(content);
  }

  async getAgents(): Promise<{ agents?: AgentConfigurationType[]; error?: string }> {
    const { apiKey, workspaceId } = this._credentials;
    const agentsUrl = `${DUST_API_URL}/${workspaceId}/assistant/agent_configurations`;

    const response = await fetch(agentsUrl, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
    });
    if (!response.ok) {
      return { error: `Could not get agents: ${response.statusText}` };
    }
    const json = (await response.json()) as {
      agentConfigurations?: AgentConfigurationType[];
      error?: DustAPIErrorResponse;
    };
    if (json.error) {
      return { error: json.error.message };
    }
    return { agents: json.agentConfigurations };
  }
}
