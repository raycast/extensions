import { useCachedPromise } from "@raycast/utils";
import { List } from "@raycast/api";
import { useContext } from "react";
import { SDKContext } from "./sdk";

export default function Storage() {
    const {storage} = useContext(SDKContext);
    const { isLoading, data: buckets, error } = useCachedPromise(async () => {
        const res = await storage.listBuckets();
        return res.buckets;
    }, [], {
        initialData: []
    })

    return <List isLoading={isLoading}>
        {!isLoading && !buckets.length && !error ? <List.EmptyView title='Create your first bucket' description='Need a hand? Learn more in our documentation.' /> :
        buckets.map(bucket => <List.Item key={bucket.$id} title={bucket.name} />)}
    </List>
}