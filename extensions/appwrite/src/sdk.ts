import { getPreferenceValues } from '@raycast/api';
import * as sdk from 'node-appwrite';
const { endpoint, project, key } = getPreferenceValues<Preferences>();

export function getSdks() {
    const client = new sdk.Client();
    const databases = new sdk.Databases(client)
    const storage = new sdk.Storage(client)
            client
            .setEndpoint(endpoint)
            .setProject(project)
            .setKey(key);
    return {databases, storage};
}

export * as sdk from 'node-appwrite';