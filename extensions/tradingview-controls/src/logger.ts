import { Ogma } from "@ogma/logger";

export const TVCLogger = new Ogma({
  application: "TradingView Controls",
  stream: { write: console.log, getColorDepth: () => 1 },
});
