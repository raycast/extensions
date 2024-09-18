import { SvglExtensionProvider } from "./components/app-context";
import SvglGrid from "./components/svgl-grid";

export default function Command() {
  return (
    <SvglExtensionProvider>
      <SvglGrid />
    </SvglExtensionProvider>
  );
}
