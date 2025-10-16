import { CompilForm } from "./cmp_CompileForm";
import { QuickCompileAction } from "./cmp_QuickCompileAction";

export default function Command() {
  return <CompilForm FormAction={QuickCompileAction} show_watchOption={false} restore_prevConfig={true} />;
}
