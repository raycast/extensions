import { UseNameGenerator } from "./services";
import { CodeElementType } from "./utils";

export default function Command() {
  return <UseNameGenerator codeElementType={CodeElementType.Module} />;
}
