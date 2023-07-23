import { getVaultNamespaceConfiguration } from "./utils";
import { VaultTree } from "./components/tree";
import { VaultNamespace } from "./components/namespace";

export default function Vault() {
  return getVaultNamespaceConfiguration() === undefined ? <VaultNamespace /> : <VaultTree path={"/"} />;
}
