import { getAvatarIcon, useCachedPromise } from "@raycast/utils";
import { chatwoot } from "./chatwoot";
import {  Icon, List } from "@raycast/api";

export default function ListConversations() {
const {isLoading, data: conversations, pagination}  = useCachedPromise(() => async(options:{ page: number }) => {
  const {data} = await chatwoot.conversations.list(String(options.page+1));
  return {
    data: data.payload,
    hasMore:false //meta.current_page!==options.page+1,
  }
},[],{initialData:[]})

return<List isLoading={isLoading} pagination={pagination}>
{!isLoading && !conversations.length ? <List.EmptyView title="There are no active conversations in this group." /> : conversations.map(conversation => <List.Item key={conversation.uuid} title={conversation.uuid} />)}
</List>
}