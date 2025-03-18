import { Detail } from "@raycast/api";
import ProviderContextProvider, { useProvider } from "./provider-context";
import { useCachedPromise } from "@raycast/utils";
import { objectstorage } from "oci-sdk";

export default function Command() {
    return <ProviderContextProvider>
        <ObjectStorage />
    </ProviderContextProvider>
}

function ObjectStorage() {
    const {provider} = useProvider();
    const {
        isLoading,
        data: namespaces,
        mutate,
      } = useCachedPromise(
        async () => {
          const objectstorageClient = new objectstorage.ObjectStorageClient({ authenticationDetailsProvider: provider });
          const namespaces = await objectstorageClient.getNamespace({ compartmentId: provider.getTenantId() });
          return namespaces.value;
        },
        [],
        { initialData: [] },
      );

    return <Detail markdown={JSON.stringify(namespaces)} />
}