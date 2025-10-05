import { useCachedPromise } from "@raycast/utils";
import { chatwoot } from "./chatwoot";
import {  List } from "@raycast/api";

export default function ListInboxes() {
const {isLoading, data: inboxes}  = useCachedPromise(async() => {
  const {payload} = await chatwoot.inboxes.list();
  return payload;
},[],{initialData:[]})

return<List isLoading={isLoading}>
{inboxes.map(inbox => <List.Item key={inbox.id} icon={inbox.avatar_url} title={inbox.name} accessories={[{tag: inbox.channel_type}]} />)}
</List>
}