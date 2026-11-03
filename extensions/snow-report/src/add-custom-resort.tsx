import { showHUD } from "@raycast/api";
import { ResortForm } from "./components/ResortForm";
import { useResorts } from "./hooks/useResorts";

// Editing and deleting custom resorts, and overriding bundled ones, happen from Search Resorts' actions.
export default function AddCustomResort() {
  const { saveCustom } = useResorts();
  return <ResortForm mode="custom" onSave={saveCustom} afterSave={() => showHUD("Resort added")} />;
}
