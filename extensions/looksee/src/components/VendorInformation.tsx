import { LookupResponse } from "../types/lookupResponse";
import { Detail } from "@raycast/api";
import { getLookupResponseMarkdown } from "../common/getLookupResponseMarkdown";

interface VendorInformationProps {
  isLoading: boolean;
  targetAddress: string;
  lookupResponse?: LookupResponse;
}

export const VendorInformation = ({ isLoading, targetAddress, lookupResponse }: VendorInformationProps) => (
  <Detail
    navigationTitle={"Vendor information"}
    isLoading={isLoading}
    markdown={!isLoading ? getVendorInformationMarkdown(targetAddress, lookupResponse) : undefined}
  />
);

const getVendorInformationMarkdown = (targetAddress: string, lookup?: LookupResponse) => `
# Vendor information
> __${targetAddress}__

${getLookupResponseMarkdown(lookup)}
`;
