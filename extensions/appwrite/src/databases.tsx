import { Action, ActionPanel, Icon, List } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { getSdks, sdk } from "./sdk";

export default function Databases() {
    const { isLoading, data: databases } = useCachedPromise(async () => {
            const {databases} = getSdks();
            const res = await databases.list();
            return res.databases;
    }, [], {
        initialData: []
    })

    return <List isLoading={isLoading} searchBarPlaceholder="Search by name or ID">
        {databases.map(database => <List.Item key={database.$id} keywords={[database.$id]} icon={Icon.Coin} title={database.name} subtitle={database.$id} actions={<ActionPanel>
            <Action.Push icon={Icon.Box} title="Collections" target={<Collections database={database} />} />
            <Action.CopyToClipboard title="Copy ID to Clipboard" content={database.$id} />
        </ActionPanel>} />)}
    </List>
}

function Collections({database}: {database: sdk.Models.Database}) {
    const { isLoading, data: collections } = useCachedPromise(async () => {
            const {databases} = getSdks();
            const res = await databases.listCollections(
                database.$id
            );
            return res.collections;
    }, [], {
        initialData: []
    })

    return <List isLoading={isLoading}>
        {collections.map(collection => <List.Item key={collection.$id} icon={Icon.Box} title={collection.name} actions={<ActionPanel>
            <Action.Push icon={Icon.Document} title="Documents" target={<Documents collection={collection} />} />
        </ActionPanel>} />)}
    </List>
}

function Documents({collection}: {collection: sdk.Models.Collection}) {
    const {isLoading, data: documents} = useCachedPromise(async () => {
        const {databases } = getSdks();
        const res = await databases.listDocuments(collection.databaseId, collection.$id);
        return res.documents;
    }, [], {
        initialData: []
    })
    return <List isLoading={isLoading}>
        {!isLoading && !documents.length ? <List.EmptyView title="Create your first document" description="Need a hand? Learn more in our documentation." /> : documents.map(document => <List.Item key={document.$id} title={document.$id} />)}
    </List>
}