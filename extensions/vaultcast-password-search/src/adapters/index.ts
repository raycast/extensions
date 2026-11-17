import type { PasswordManagerAdapter } from "../types";
import { onePasswordAdapter } from "./1password";
import { bitwardenAdapter } from "./bitwarden";
import { dashlaneAdapter } from "./dashlane";
import { keepassxcAdapter } from "./keepassxc";
import { keeperAdapter } from "./keeper";
import { lastPassAdapter } from "./lastpass";
import { passAdapter } from "./pass";
import { protonPassAdapter } from "./protonpass";

export const adapters: PasswordManagerAdapter[] = [
  protonPassAdapter,
  bitwardenAdapter,
  onePasswordAdapter,
  keepassxcAdapter,
  passAdapter,
  lastPassAdapter,
  dashlaneAdapter,
  keeperAdapter,
];
