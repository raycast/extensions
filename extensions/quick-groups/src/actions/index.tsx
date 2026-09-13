import "./built-ins";
import "./namespaced";
import "./custom";

export {
  getActionDefinition,
  isReservedActionNamespace,
  isRegisteredAction,
  registerAction,
  registerActionResolver,
  registeredActionNames,
  registeredActionPrefixes,
} from "./registry";
export type { ActionDefinition, ActionResolver } from "./registry";
export { registerScriptCommandAction } from "./script-command";
export type { ScriptCommandActionOptions } from "./script-command";
