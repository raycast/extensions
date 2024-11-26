import common = require("oci-common");
import * as cloudguard from "oci-cloudguard";
import { useCachedPromise } from "@raycast/utils";
import { Detail, List } from "@raycast/api";

const provider: common.ConfigFileAuthenticationDetailsProvider = new common.ConfigFileAuthenticationDetailsProvider();
const cloudguardClient = new cloudguard.CloudGuardClient({ authenticationDetailsProvider: provider });
export default function Resources() {
    const { isLoading, data: resources, error } = useCachedPromise(
        async () => {
          const resources = await cloudguardClient.listResources({ compartmentId: provider.getTenantId() });
          return resources.resourceCollection.items;
        }, [], { initialData: [] }
    )
        if (error) return <Detail markdown={JSON.stringify(error)} />
    return <List isLoading={isLoading}>
        {resources.map(resource => <List.Item key={resource.id} title={resource.resourceName ?? ""} />)}
    </List>
}