import { useCachedPromise } from "@raycast/utils";
import { chatwoot } from "./chatwoot";
import { Color, Icon, List } from "@raycast/api";
import { Integration } from "./types";

function getIntegrationIcon(integration: Integration) {
  const light = chatwoot.buildUrl(`dashboard/images/integrations/${integration.id}.png`).toString();
  const dark = light.replace(".png", "-dark.png");
  return {light,dark};
}
export default function ListIntegrations() {
const {isLoading, data: integrations}  = useCachedPromise(async() => {
  const {payload} = await chatwoot.contacts.list();
  return payload;
},[],{initialData:[]})

return<List isLoading={isLoading} isShowingDetail>
{integrations.map(integration => <List.Item key={integration.id} icon={{source: getIntegrationIcon(integration)}} title={integration.name} accessories={[{icon: {source:Icon.CheckCircle, tintColor:integration.enabled ? Color.Green : undefined}, tooltip: integration.enabled ? "Enabled" : "Disabled"}]} detail={<List.Item.Detail markdown={integration.description} />} />)}
</List>
}