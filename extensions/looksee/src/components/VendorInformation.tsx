import { LookupResponse } from "../types/lookupResponse";
import { Detail } from "@raycast/api";

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

    🌍 Country: ${lookup?.country}  
    🏢 Company: ${lookup?.company}  
    📫 Address L1: ${lookup?.addressL1}  
    📫 Address L2: ${lookup?.addressL2}  
    📫 Address L3: ${lookup?.addressL3}  
    📫 Address L3: ${lookup?.addressL3}  
    📠 Hex start: ${lookup?.startHex}  
    📠 Hex end: ${lookup?.endHex}  
    📠 Dec start: ${lookup?.startDec}  
    📠 Dec end: ${lookup?.endDec}  
    📜 Type: ${lookup?.type}
`;
