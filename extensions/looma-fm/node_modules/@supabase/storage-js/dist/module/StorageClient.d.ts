import StorageFileApi from './packages/StorageFileApi';
import StorageBucketApi from './packages/StorageBucketApi';
import { Fetch } from './lib/fetch';
export interface StorageClientOptions {
    useNewHostname?: boolean;
}
export declare class StorageClient extends StorageBucketApi {
    constructor(url: string, headers?: {
        [key: string]: string;
    }, fetch?: Fetch, opts?: StorageClientOptions);
    /**
     * Perform file operation in a bucket.
     *
     * @param id The bucket id to operate on.
     */
    from(id: string): StorageFileApi;
}
//# sourceMappingURL=StorageClient.d.ts.map