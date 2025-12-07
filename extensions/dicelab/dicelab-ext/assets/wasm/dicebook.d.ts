/* tslint:disable */
/* eslint-disable */
export function apply_changes(session_id: number, _changes: any, new_text: string): void;
export function set_session_aliases(session_id: number, aliases: any): void;
export function get_tokens(session_id: number): Array<any>;
export function create_session(initial_text: string): number;
export function get_diagnostics(session_id: number): Array<any>;
export class WasmEngine {
  free(): void;
  [Symbol.dispose](): void;
  importDdb(character_id: string): Promise<any>;
  getAliases(): any;
  setAliases(aliases: any): void;
  setLogLevel(level: string): void;
  getLogConfig(): any;
  constructor(storage_key?: string | null);
  resetContext(): void;
  evaluate(input: string): any;
}
