import { LaunchProps } from "@raycast/api";
import { useFetch } from "@raycast/utils";
import { LookupResponse } from "./common/types/lookupResponse";
import { VendorInformation } from "./lookup/VendorInformation";
import { FetchError } from "./lookup/FetchError";
import { EmptyError } from "./lookup/EmptyError";
import { useLookupHistoryStorage } from "./lookup/useLookupHistoryStorage";

export default function lookup(props: LaunchProps<{ arguments: Arguments.Lookup }>) {
  const commandAddress = props.arguments.address;
  const address = commandAddress || props.fallbackText || "";

  const { isLoading, data, error } = useFetch<LookupResponse[]>(`https://www.macvendorlookup.com/api/v2/${address}`);

  const showFetchError = !isLoading && !!error;
  const showEmptyError = !isLoading && !showFetchError && !data;
  const showVendorInfo = !showFetchError && !showEmptyError;

  useLookupHistoryStorage(address, isLoading, data);

  return (
    <>
      {showFetchError && <FetchError targetAddress={address} error={error} />}
      {showEmptyError && <EmptyError targetAddress={address} />}
      {showVendorInfo && <VendorInformation isLoading={isLoading} targetAddress={address} lookupResponse={data?.[0]} />}
    </>
  );
}
