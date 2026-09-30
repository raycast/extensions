export type ExivoComponent = {
  id: string;
  identifier: string;
  labelling: string;
  remarks: string;
  accessZones: string[];
  templateIdentifier: string;
  ready: boolean;
  readonly mode: ExivoComponentMode;
};

export type ExivoComponentMode = "open" | "normal" | "closed";
