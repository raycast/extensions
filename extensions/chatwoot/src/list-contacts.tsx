import { getAvatarIcon, useCachedPromise } from "@raycast/utils";
import { chatwoot } from "./chatwoot";
import {  Icon, List } from "@raycast/api";

export default function ListContacts() {
const {isLoading, data: contacts, pagination}  = useCachedPromise(() => async(options:{ page: number }) => {
  const {meta, payload} = await chatwoot.contacts.list({page: String(options.page+1)});
  return {
    data: payload,
    hasMore: meta.current_page!==options.page+1,
  }
},[],{initialData:[]})

return<List isLoading={isLoading} pagination={pagination}>
{contacts.map(contact => <List.Item key={contact.id} icon={contact.thumbnail || getAvatarIcon(contact.name)} title={contact.name} subtitle={contact.email} accessories={[
{ icon:Icon.Building, text: contact.additional_attributes.company_name },
{date: new Date(contact.created_at*1000)}]} />)}
</List>
}