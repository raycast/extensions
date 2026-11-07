import type { PasswordManagerAdapter } from "../types";
import { protonPassAdapter } from "./protonpass";
// import { onePasswordAdapter } from "./1password";

export const adapters: PasswordManagerAdapter[] = [
  protonPassAdapter,
  // onePasswordAdapter,
];
