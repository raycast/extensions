import * as Abi from "./abi";
import * as Account from "./account";
import * as Block from "./block";
import * as Ens from "./ens";
import * as Utility from "./utility";
import * as Wallet from "./wallet";

import { CommandCategory } from "./types";

const allCommands: CommandCategory[] = [
  { title: "ABI", items: Abi },
  { title: "Account", items: Account },
  { title: "Block", items: Block },
  { title: "ENS", items: Ens },
  { title: "Utility", items: Utility },
  { title: "Wallet", items: Wallet },
];

export default allCommands;
