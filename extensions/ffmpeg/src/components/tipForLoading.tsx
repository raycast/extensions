import { Detail } from "@raycast/api";
import { fileState$ } from "../managers/fileManager";

export function TipForLoading() {
  const loadingDesc = fileState$.loadingDesc.use();
  const content = `# Loading...\n\n${loadingDesc}`;

  return <Detail markdown={content} />;
}
