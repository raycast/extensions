import { getVaultNamespace } from "./utils";
import { VaultTree } from "./components/tree";
import { VaultNamespace } from "./components/namespace";

export default function Vault() {
  return !getVaultNamespace() ? <VaultNamespace /> : <VaultTree path={"/"} />;
}
