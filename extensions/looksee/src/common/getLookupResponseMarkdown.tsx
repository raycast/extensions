import { LookupResponse } from "./types/lookupResponse";

export const getLookupResponseMarkdown = (lookup?: LookupResponse) => `
    🌍 Country: ${lookup?.country}  
    🏢 Company: ${lookup?.company}  
    📫 Address L1: ${lookup?.addressL1}  
    📫 Address L2: ${lookup?.addressL2}  
    📫 Address L3: ${lookup?.addressL3}  
    📠 Hex start: ${lookup?.startHex}  
    📠 Hex end: ${lookup?.endHex}  
    📠 Dec start: ${lookup?.startDec}  
    📠 Dec end: ${lookup?.endDec}  
    📜 Type: ${lookup?.type}
`;
