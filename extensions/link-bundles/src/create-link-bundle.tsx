import { BundleForm } from "./components/BundleForm";
import { useBundles } from "./hooks/useBundles";

export default function CreateBundleCommand() {
  const { createBundle } = useBundles();
  return <BundleForm onSubmit={createBundle} />;
}
