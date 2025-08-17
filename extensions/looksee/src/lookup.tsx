import { LaunchProps } from "@raycast/api";
import { useFetch } from "@raycast/utils";
import { LookupResponse } from "./common/types/lookupResponse";
import { VendorInformation } from "./lookup/VendorInformation";
import { FetchError } from "./lookup/FetchError";
import { EmptyError } from "./lookup/EmptyError";
import { useLookupHistoryStorage } from "./lookup/useLookupHistoryStorage";
import { LocalAddress } from "./lookup/LocalAddress";
import { useLocalAddressCheck } from "./lookup/useLocalAddressCheck";

export default function lookup(props: LaunchProps<{ arguments: Arguments.Lookup }>) {
  const commandAddress = props.arguments.address;
  const address = commandAddress || props.fallbackText || "";

  const [isLocalAddress, setIsLocalAddress] = useLocalAddressCheck(address);
  const ignoreLocalAddressFilter = () => setIsLocalAddress(false);

  const { isLoading, data, error } = useFetch<LookupResponse[]>(`https://www.macvendorlookup.com/api/v2/${address}`, {
    execute: !isLocalAddress,
  });

  const showLocalAddress = isLocalAddress;
  const showFetchError = !showLocalAddress && !isLoading && !!error;
  const showEmptyError = !showLocalAddress && !isLoading && !showFetchError && !data;
  const showVendorInfo = !showLocalAddress && !showFetchError && !showEmptyError;

  useLookupHistoryStorage(address, isLoading, data);

  return (
    <>
      {showLocalAddress && <LocalAddress targetAddress={address} onAction={ignoreLocalAddressFilter} />}
      {showFetchError && <FetchError targetAddress={address} error={error} />}
      {showEmptyError && <EmptyError targetAddress={address} />}
      {showVendorInfo && <VendorInformation isLoading={isLoading} targetAddress={address} lookupResponse={data?.[0]} />}
    </>
  );
}
