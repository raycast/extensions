import Postiz from "@postiz/node";
import { Detail, getPreferenceValues, Grid, List } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";

const {api_key, url} = getPreferenceValues<Preferences>();
const postiz = new Postiz(api_key, url);
type Integration = {
    id: string;
    name: string;
    identifier: string;
    picture: string;
    disabled: boolean;
    profile: string;
}
export default function SearchChannels() {
    const {isLoading, data: integrations} = useCachedPromise(async () => {
        const data = await postiz.integrations() as Integration[];
        return data;
    }, [], {
        initialData: []
    });

    return <List isLoading={isLoading}>
        {integrations.map(integration => <List.Item key={integration.id} icon={integration.picture} title={integration.name} subtitle={integration.identifier} />)}
    </List>
}