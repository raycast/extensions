import { Detail } from "@raycast/api";
import ProviderContextProvider, { useProvider } from "./provider-context";
import { useCachedPromise } from "@raycast/utils";
import { objectstorage } from "oci-sdk";

export default function Command() {
  return (
    <ProviderContextProvider>
      <ObjectStorage />
    </ProviderContextProvider>
  );
}

function ObjectStorage() {
  const { provider } = useProvider();
  const {
    isLoading,
    data: namespaces,
    mutate,
  } = useCachedPromise(
    async () => {
      const objectstorageClient = new objectstorage.ObjectStorageClient({ authenticationDetailsProvider: provider });
      const namespaces = await objectstorageClient.getNamespace({});
      return namespaces.value;
    },
    [],
    { initialData: [], onError(error) {
      console.log(error)
    }, execute: !!provider },
  );

  return <Detail markdown={JSON.stringify(namespaces)} />;
}
