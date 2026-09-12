import { NameGenerator } from "./services";
import { CodeElementType } from "./utils";

export default function Command() {
  return <NameGenerator codeElementType={CodeElementType.Class} />;
}
