// Hand-maintained declaration for the generated Swift bridge (raycast.d.ts).
// Keep in sync with swift/Sources/ExternalHDR/API.swift.
export function listDisplays(): Promise<
  {
    id: number;
    name: string;
    uuid: string;
    builtin: boolean;
    hdrCapable: boolean;
    hdr: boolean;
  }[]
>;
export function setHdr(displayID: number, value: string): Promise<boolean>;
