import { listDisplays as swiftListDisplays, setHdr as swiftSetHdr } from "swift:../swift";

export type Display = {
  id: number;
  name: string;
  uuid: string;
  builtin: boolean;
  hdrCapable: boolean;
  hdr: boolean;
};

export async function listDisplays(): Promise<Display[]> {
  return (await swiftListDisplays()) as Display[];
}

export async function setHdr(displayID: number, value: "on" | "off" | "toggle"): Promise<boolean> {
  return swiftSetHdr(displayID, value);
}
