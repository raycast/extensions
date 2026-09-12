export const PAGE = 1; // PAGE
export const SECTION = 2; // SECTION
export const GROUP = 3; // SECTION GROUP
export const NOTEBOOK = 4; // NOTEBOOK

export const types = [
  { id: PAGE, desc: "Notes" },
  { id: SECTION, desc: "Sections" },
  { id: GROUP, desc: "Section Groups" },
  { id: NOTEBOOK, desc: "Notebooks" },
];

export type OneNoteItem = {
  Type: number;
  GOID: string;
  GUID: string;
  GOSID: string;
  ParentGOID: string;
  GrandparentGOIDs: string;
  ContentRID: string;
  RootRevGenCount: number;
  LastModifiedTime: number;
  RecentTime: number;
  PinTime: number;
  Color: number;
  Title: string;
  EnterpriseIdentity: string;
  Content: string;
};
