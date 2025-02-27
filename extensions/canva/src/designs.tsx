import { authorize, client } from "./oauth";
import { DesignService } from "../client/ts";
import { Action, ActionPanel, Icon, Grid } from "@raycast/api";
import { createClient } from "@hey-api/client-fetch";
import { useCachedPromise } from "@raycast/utils";

export default function Index() {
  const { isLoading, data } = useCachedPromise(async () => {
    await authorize();
    const token = (await client.getTokens())?.accessToken;
    const cnvClient = createClient({
      headers: {
        Authorization: `Bearer ${token}`
      },
      baseUrl: "https://api.canva.com/rest"
    })
    
    const { data, error } = await DesignService.listDesigns({ client: cnvClient });
    if (error) throw new Error(error.message);
    return data.items;
  }, [], {
    initialData: []
  })
  
  return <Grid isLoading={isLoading}>
    {data.map(design => <Grid.Item key={design.id} content={design.thumbnail?.url} title={design.title || ""} accessories={[
      { icon: Icon.Document, text: design.page_count?.toString() },
      {date: new Date(design.updated_at * 1000)}
    ]} actions={<ActionPanel>
      <Action.OpenInBrowser title="Open View URL" url={design.urls.view_url} />
    </ActionPanel>} />)}
  </Grid>
}
