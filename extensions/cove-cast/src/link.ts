import {
  buildDeeplink,
  buildTgDeeplink,
  type ChainType,
  type LinkKind,
} from "./cove";
import { COVE_BOT_USERNAME } from "./preferences";

export type LinkArgs = {
  kind: LinkKind;
  ca: string;
  type: ChainType;
  chainId: string;
  amount?: number;
  target?: "tg" | "https";
};

/** Build a Cove deeplink for the given args using native protocol building. */
export function buildCoveLink(args: LinkArgs): string {
  const opts = {
    kind: args.kind,
    chainId: args.chainId,
    ca: args.ca,
    type: args.type,
    amount: args.amount,
    botUsername: COVE_BOT_USERNAME,
  };
  return args.target === "tg" ? buildTgDeeplink(opts) : buildDeeplink(opts);
}
