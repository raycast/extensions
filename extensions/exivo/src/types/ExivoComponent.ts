export type ExivoComponent = {
  id: string;
  identifier: string;
  labelling: string;
  remarks: string;
  accessZones: string[];
  templateIdentifier: string;
  ready: boolean;
  mode: "open" | "normal" | "closed";
};
