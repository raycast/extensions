import { EbirdCategory } from "../types/ebird";
import { Tag } from "../types/general";

export const tagByCategory: Record<EbirdCategory, Tag> = {
  [EbirdCategory.Domestic]: { value: "Domestic", color: "#ffa500" },
  [EbirdCategory.Form]: { value: "Form", color: "#00bfff" },
  [EbirdCategory.Hybrid]: { value: "Hybrid", color: "#9932cc" },
  [EbirdCategory.Intergrade]: { value: "Intergrade", color: "#8b0000" },
  [EbirdCategory.Issf]: { value: "ISSF", color: "#32cd32" },
  [EbirdCategory.Slash]: { value: "Slash", color: "#bdb76b" },
  [EbirdCategory.Species]: { value: "Species", color: "#228b22" },
  [EbirdCategory.Spuh]: { value: "Spuh", color: "#d3d3d3" },
};
