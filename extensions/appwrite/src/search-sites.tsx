import { getPreferenceValues, List } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
// const sdk = require('node-appwrite');
import sdk from 'node-appwrite';

const { endpoint, project, key } = getPreferenceValues<Preferences>();
export default function SearchSites() {
    const { isLoading } = useCachedPromise(async () => {
        const client = new sdk.Client();
            client
                .setEndpoint(endpoint)
                .setProject(project)
                .setKey(key)
                // .setSelfSigned() // Use only on dev mode with a self-signed SSL cert
            ;
            const databases = new sdk.Databases(client)
            const res = await databases.list();
            return res.databases;
    }, [], {
        initialData: []
    })

    return <List isLoading={isLoading}>
        
    </List>
}