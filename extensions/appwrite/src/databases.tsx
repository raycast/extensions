import { Action, ActionPanel, Detail, getPreferenceValues, Icon, List, openExtensionPreferences } from "@raycast/api";
import { showFailureToast, useCachedPromise } from "@raycast/utils";
import * as sdk from 'node-appwrite';
import { createContext, JSX, useContext } from "react";

const { endpoint, project, key } = getPreferenceValues<Preferences>();

const client = new sdk.Client();
const ClientContext = createContext<sdk.Client>(client);
function ClientProvider({ children }: { children: JSX.Element }) {
    try {
        client
            .setEndpoint(endpoint)
            .setProject(project)
            .setKey(key);
    } catch (error) {
        showFailureToast(error);
        return <Detail markdown={`# ERROR \n\n ${error}`} actions={<ActionPanel>
            <Action icon={Icon.Gear} title="Open Extension Preferences" onAction={openExtensionPreferences} />
        </ActionPanel>} />
    }

    return <ClientContext.Provider value={client}>
        {children}
    </ClientContext.Provider>
}

function withClientProvider<T>(Component: React.ComponentType<T>) {
    return function WrappedComponent(props: T) {
        return (
            <ClientProvider>
                <Component {...props} />
            </ClientProvider>
        );
    };
}

export default withClientProvider(Databases);

function Databases() {
    const client = useContext(ClientContext);
    const { isLoading, data: databases } = useCachedPromise(async () => {
            const databases = new sdk.Databases(client)
            const res = await databases.list();
            return res.databases;
    }, [], {
        initialData: []
    })

    return <List isLoading={isLoading} searchBarPlaceholder="Search by name or ID">
        {databases.map(database => <List.Item key={database.$id} keywords={[database.$id]} icon={Icon.Coin} title={database.name} subtitle={database.$id} actions={<ActionPanel>
            <Action.Push title="Collections" target={<Collections database={database} />} />
            <Action.CopyToClipboard title="Copy ID to Clipboard" content={database.$id} />
        </ActionPanel>} />)}
    </List>
}

function Collections({database}: {database: sdk.Models.Database}) {
    const client = useContext(ClientContext);
    
    const { isLoading, data: collections } = useCachedPromise(async () => {
            const databases = new sdk.Databases(client)
            const res = await databases.listCollections(
                database.$id
            );
            return res.collections;
    }, [], {
        initialData: []
    })

    return <List isLoading={isLoading} navigationTitle={`Databases > ${database.name}`}>
        {collections.map(collection => <List.Item key={collection.$id} title={collection.name} />)}
    </List>
}