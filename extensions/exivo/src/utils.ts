import { ExivoComponentMode } from "./types/ExivoComponent";

export const getDoorModeTitle = (mode: ExivoComponentMode) => {
  switch (mode) {
    case "open":
      return "Permanent Open";
    case "normal":
      return "Normal";
    case "closed":
      return "Locked";
  }
};
