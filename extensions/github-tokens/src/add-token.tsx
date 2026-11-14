import { popToRoot, showHUD } from "@raycast/api";
import { TokenForm } from "./components/TokenForm";

export default function Command() {
  return (
    <TokenForm
      onSaved={async (name) => {
        await showHUD(`Token "${name}" salvo`);
        await popToRoot({ clearSearchBar: true });
      }}
    />
  );
}
