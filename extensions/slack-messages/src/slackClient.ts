import { preferences } from "@raycast/api";
import _ from "lodash";
import { Channel } from "@slack/web-api/dist/response/ConversationsListResponse";
import { Message as MessageResponse } from "@slack/web-api/dist/response/ConversationsHistoryResponse";

import { compareDesc } from "date-fns";
import { getLocalStorageItem, setLocalStorageItem } from "@raycast/api";
import { dateFromTimeStamp } from "./utils";
import { WebClient } from "@slack/web-api";

export interface ListViewModel {
  channels?: ConversationInfo[];
  privateGroups?: ConversationInfo[];
  directs?: ConversationInfo[];
  multiparty?: ConversationInfo[];
  isLoading: boolean;
}

export interface ConversationInfo {
  id: string;
  name: string;
  type: ConversationType;
  messages?: Message[];
  lastMessageDate: Date;
  lastMessageTs: string;
  hasUnread: boolean;
  hasMoreThen100Unreads: boolean;
}

export interface Message {
  ts: string;
  text?: string;
  author: string;
  date: Date;
  type: string;
}

// export type MessageType = "default" | "bot_message";

export function messageTextDescription(message: Message): string {
  switch (message.type) {
    case "default":
      return message.text ?? "";
    case "bot_message":
      return "A message from Bot";
  }
  return "";
}

enum ConversationType {
  Channel = "public_channel",
  Private = "private_channel",
  Multiparty = "mpim",
  Direct = "im",
}

const web = new WebClient(preferences.accessToken?.value as string);
let localConversations: ConversationInfo[] | undefined;

export class SlackService {
  private slackJSONLocalStorageKey = "slack-services";

  async cachedConversations(): Promise<ListViewModel | undefined> {
    const conversationsJSON = await getLocalStorageItem<string>(this.slackJSONLocalStorageKey);

    if (!conversationsJSON) {
      return undefined;
    }
    const conversations = (JSON.parse(conversationsJSON) as ConversationInfo[]).filter((c) => c.hasUnread);
    conversations.forEach((c) => {
      c.lastMessageDate = new Date(c.lastMessageDate as unknown as string);
      c.messages?.forEach((m) => {
        m.date = new Date(m.date as unknown as string);
      });
    });
    localConversations = conversations;
    if (conversations) {
      const viewModel = this.viewModelForConversations(conversations);
      viewModel.isLoading = true;
      return viewModel;
    }
    return undefined;
  }

  async useListViewModel(): Promise<ListViewModel> {
    const conversations = await this.conversations();
    if (conversations) {
      return this.viewModelForConversations(conversations.filter((c) => c.hasUnread));
    }

    return {
      isLoading: false,
    };
  }
  async conversations(): Promise<ConversationInfo[] | undefined> {
    const conversations = await this.fetchConversations();
    if (conversations) {
      this.cacheConversations(conversations);
    }
    localConversations = conversations;
    return conversations;
  }

  /**
   * Don't make calls to this method very often. When needing to mark a read position, a client should set a timer before making the call.
   * In this way, any further updates needed during the timeout will not generate extra calls (just one per channel). This is useful for when reading scroll-back history, or following a busy live channel.
   * A timeout of 5 seconds is a good starting point.
   */
  async markAsRead(conversation: ConversationInfo): Promise<Error | undefined> {
    if (conversation.id && conversation.lastMessageTs && conversation.lastMessageDate) {
      if (conversation.hasUnread) {
        try {
          const read = await web.conversations.mark({ channel: conversation.id, ts: conversation.lastMessageTs });
          return new Error(read.error);
        } catch (error) {
          return error as Error;
        }
      }
    }
    return undefined;
  }

  async markAllAsRead(): Promise<void> {
    localConversations
      ?.filter((c) => c.hasUnread)
      ?.forEach(async (c) => {
        try {
          //TODO: switch type of convers and mark im.mark, conversations.mark, groups.mark
          const read = await web.conversations.mark({ channel: c.id, ts: c.lastMessageTs });
          return new Error(read.error);
        } catch (error) {
          return error as Error;
        }
      });
  }

  private async fetchConversations(): Promise<ConversationInfo[] | undefined> {
    try {
      const conversations = await web.conversations.list({
        exclude_archived: true,
        types: "public_channel, private_channel, mpim, im",
      });
      const channels = conversations.channels?.filter((channel) => channel.is_member);
      const unread = channels?.map(async (channel) => {
        if (channel.id && channel.name) {
          const chanelInfo = await web.conversations.info({ channel: channel.id });
          const lastRead = chanelInfo.channel?.last_read;
          if (lastRead) {
            let hasUnread = false;
            const lastReadDate = dateFromTimeStamp(lastRead);
            const history = await web.conversations.history({ channel: channel.id, oldest: lastRead });

            // TODO: Don't run loop twice
            const lastMessageTS = _.first(
              history.messages?.map((message) => {
                const timestamp = message.ts;
                if (timestamp) {
                  const messageDate = dateFromTimeStamp(timestamp);
                  hasUnread = messageDate > lastReadDate;
                  return timestamp;
                }
              })
            );

            const result: ConversationInfo = {
              id: channel.id,
              name: channel.name,
              messages: hasUnread
                ? // TODO: Don't run loop twice
                  _.compact(
                    history.messages
                      ?.flatMap((m) => {
                        console.log(`c: ${channel.name} subtype ${m.subtype}, user: ${m.user}, name: ${m.username}`);
                        if (m.ts) {
                          const messageViewModel: Message = {
                            ts: m.ts,
                            date: dateFromTimeStamp(m.ts),
                            text: m.text,
                            author: m.username ?? "Unknown",
                            type: m.subtype ?? "default",
                          };
                          return messageViewModel;
                        }
                      })
                      .sort((m1, m2) => {
                        if (m1?.date && m2?.date) {
                          return compareDesc(m1?.date, m2?.date);
                        }
                        return -1;
                      })
                  )
                : undefined,
              lastMessageDate: lastReadDate,
              lastMessageTs: lastMessageTS ?? new Date().toTimeString(),
              type: this.conversationTypeForChannel(channel),
              hasUnread,
              hasMoreThen100Unreads: history.has_more ?? false,
            };
            return result;
          }
        }
      });

      if (unread) {
        return _.compact(await Promise.all(unread));
      }
    } catch (error) {
      console.error(error);
    }

    return undefined;
  }

  private async cacheConversations(conversations: ConversationInfo[]) {
    return setLocalStorageItem(this.slackJSONLocalStorageKey, JSON.stringify(conversations));
  }

  /**
   * Helpers
   */

  private viewModelForConversations(conversations: ConversationInfo[]): ListViewModel {
    const channels: ConversationInfo[] = [];
    const privateGroups: ConversationInfo[] = [];
    const directs: ConversationInfo[] = [];
    const multiparty: ConversationInfo[] = [];

    conversations?.forEach((c) => {
      switch (c.type) {
        case ConversationType.Channel:
          channels.push(c);
          break;
        case ConversationType.Private:
          privateGroups.push(c);
          break;

        case ConversationType.Direct:
          directs.push(c);
          break;
        case ConversationType.Multiparty:
          multiparty.push(c);
          break;
        default:
          break;
      }
    });

    channels.sort((c1, c2) => compareDesc(c1.lastMessageDate, c2.lastMessageDate));
    privateGroups.sort((c1, c2) => compareDesc(c1.lastMessageDate, c2.lastMessageDate));
    directs.sort((c1, c2) => compareDesc(c1.lastMessageDate, c2.lastMessageDate));
    multiparty.sort((c1, c2) => compareDesc(c1.lastMessageDate, c2.lastMessageDate));

    return {
      isLoading: false,
      channels,
      privateGroups,
      directs,
      multiparty,
    };
  }

  private conversationTypeForChannel(channel: Channel): ConversationType {
    if (channel.is_channel && !channel.is_mpim) {
      return ConversationType.Channel;
    }

    if (channel.is_group) {
      return ConversationType.Private;
    }

    if (channel.is_im) {
      return ConversationType.Direct;
    }

    if (channel.is_mpim) {
      return ConversationType.Multiparty;
    }
    return ConversationType.Channel;
  }
}

export const slackService = new SlackService();
