import { ActionPanel, Detail, List, Action, Icon, getPreferenceValues, Image } from "@raycast/api";
import { useFetch } from "@raycast/utils";
import { useState } from "react";

type Form = {
id:number
name:string
design: {
  "background-color":string
  "background-image-url":string
}
submissions_count: number | null
}
type Result<T> = {
  data: T
}
type PaginatedResult<T> = Result<{data: T[]}>
const {api_token} = getPreferenceValues<Preferences>();
export default function SearchForms() {
  const [isShowingDetail, setIsShowingDetail] = useState(false);
  const {isLoading,data:forms} = useFetch("https://app.youform.com/api/forms", {
    headers: {
      Authorization: `Bearer ${api_token}`,
      Accept: "application/json"
    },
    mapResult(result: PaginatedResult<Form>) {
      return {
        data: result.data.data
      }
    },
    initialData: []
  })
  return <List isLoading={isLoading} isShowingDetail={isShowingDetail}>
    {!isLoading && !forms.length ? <List.EmptyView icon={{source: Icon.Warning, mask: Image.Mask.Circle}} title="No forms created in this workspace yet." description="What would you like to do?" actions={<ActionPanel>
      <Action.OpenInBrowser icon={Icon.PlusCircle} title="Create Form" url="https://app.youform.com/dashboard" />
      <Action.OpenInBrowser icon={Icon.AddPerson} title="Invite Team" url="https://app.youform.com/dashboard" />
    </ActionPanel>} /> : forms.map(form => <List.Item key={form.id} icon={form.design["background-image-url"] || {source:Icon.List, tintColor:form.design["background-color"]}} title={form.name} subtitle={!isShowingDetail ? form.submissions_count ? form.submissions_count.toString() : "No responses" : `${form.submissions_count|| "0"}`} actions={<ActionPanel>
      <Action icon={Icon.AppWindowSidebarLeft} title="Toggle Details" onAction={() => setIsShowingDetail(show => !show)} />
    </ActionPanel>} />)}
  </List>
}
