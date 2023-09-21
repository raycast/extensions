import { LaunchProps } from "@raycast/api";
import { useFetch } from "@raycast/utils";
import { LookupResponse } from "./types/lookupResponse";
import { VendorInformation } from "./components/VendorInformation";
import { FetchError } from "./common/FetchError";
import { EmptyError } from "./common/EmptyError";

export default function Lookup(props: LaunchProps<{ arguments: Arguments.Lookup }>) {
  const { address } = props.arguments;
  const { isLoading, data, error } = useFetch<LookupResponse[]>(`https://www.macvendorlookup.com/api/v2/${address}`);

  const showFetchError = !isLoading && !!error;
  const showEmptyError = !isLoading && !showFetchError && !data;
  const showVendorInfo = !showFetchError && !showEmptyError;

  return (
    <>
      {showFetchError && <FetchError targetAddress={address} error={error} />}
      {showEmptyError && <EmptyError targetAddress={address} />}
      {showVendorInfo && <VendorInformation isLoading={isLoading} targetAddress={address} lookupResponse={data?.[0]} />}
    </>
  );
}
