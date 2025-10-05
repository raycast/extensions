import { getAvatarIcon, useCachedPromise } from "@raycast/utils";
import { chatwoot } from "./chatwoot";
import {  List } from "@raycast/api";
import { formatDistanceToNow } from "date-fns";

export default function ListConversations() {
const {isLoading, data: conversations}  = useCachedPromise(async() => {
  const {data} = await chatwoot.conversations.list();
  return data.payload;
},[],{initialData:[]})

return<List isLoading={isLoading}>
{!isLoading && !conversations.length ? <List.EmptyView title="There are no active conversations in this group." /> : conversations.map(conversation => <List.Item key={conversation.id} icon={getAvatarIcon(conversation.meta.sender.name)} title={conversation.meta.sender.name} subtitle={conversation.messages[0].content} accessories={[
  {date: new Date(conversation.created_at*1000), tooltip: `Created ${formatDistanceToNow(new Date(conversation.created_at*1000), {addSuffix: true})}`},
  {date: new Date(conversation.last_activity_at*1000), tooltip: `Last activity ${formatDistanceToNow(new Date(conversation.last_activity_at*1000), {addSuffix: true})}`}
  ]} />)}
</List>
}