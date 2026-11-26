import { Num } from "./num";

export type RelOp = "=" | "≠" | "<" | ">" | "≤" | "≥";

export type Node =
  | { type: "num"; value: Num }
  | { type: "var"; name: string }
  | { type: "unit"; name: string } // Nspire unit/constant name without "_"
  | { type: "const"; name: "π" | "e" | "∞" }
  | { type: "bool"; value: boolean }
  | { type: "add"; l: Node; r: Node }
  | { type: "sub"; l: Node; r: Node }
  | { type: "mul"; l: Node; r: Node; implicit?: boolean }
  | { type: "div"; l: Node; r: Node }
  | { type: "pow"; l: Node; r: Node }
  | { type: "neg"; arg: Node }
  | { type: "fact"; arg: Node }
  | { type: "pct"; arg: Node }
  | { type: "call"; name: string; args: Node[] }
  | { type: "rel"; op: RelOp; l: Node; r: Node }
  | { type: "and"; l: Node; r: Node }
  | { type: "or"; l: Node; r: Node }
  | { type: "not"; arg: Node }
  | { type: "list"; items: Node[] }
  | { type: "convert"; l: Node; r: Node }
  | { type: "with"; l: Node; r: Node }
  | { type: "assign"; name: string; params?: string[]; body: Node };

export const num = (value: Num): Node => ({ type: "num", value });
export const v = (name: string): Node => ({ type: "var", name });
export const bin = <T extends "add" | "sub" | "mul" | "div" | "pow">(type: T, l: Node, r: Node): Node =>
  ({ type, l, r }) as Node;

export function walk(n: Node, fn: (n: Node) => void): void {
  fn(n);
  switch (n.type) {
    case "add":
    case "sub":
    case "mul":
    case "div":
    case "pow":
    case "rel":
    case "and":
    case "or":
    case "convert":
    case "with":
      walk(n.l, fn);
      walk(n.r, fn);
      break;
    case "neg":
    case "fact":
    case "pct":
    case "not":
      walk(n.arg, fn);
      break;
    case "call":
      n.args.forEach((a) => walk(a, fn));
      break;
    case "list":
      n.items.forEach((a) => walk(a, fn));
      break;
    case "assign":
      walk(n.body, fn);
      break;
  }
}

export function containsVar(n: Node, names: Set<string>): boolean {
  let found = false;
  walk(n, (x) => {
    if (x.type === "var" && names.has(x.name)) found = true;
  });
  return found;
}

/** Splits a chain of `and` into its conjuncts. */
export function conjuncts(n: Node): Node[] {
  return n.type === "and" ? [...conjuncts(n.l), ...conjuncts(n.r)] : [n];
}

export function disjuncts(n: Node): Node[] {
  return n.type === "or" ? [...disjuncts(n.l), ...disjuncts(n.r)] : [n];
}

export function joinWith(type: "and" | "or", items: Node[]): Node {
  return items.reduce((acc, x) => ({ type, l: acc, r: x }));
}

export function mapChildren(n: Node, f: (x: Node) => Node): Node {
  switch (n.type) {
    case "add":
    case "sub":
    case "mul":
    case "div":
    case "pow":
    case "rel":
    case "and":
    case "or":
    case "convert":
    case "with":
      return { ...n, l: f(n.l), r: f(n.r) } as Node;
    case "neg":
    case "fact":
    case "pct":
    case "not":
      return { ...n, arg: f(n.arg) } as Node;
    case "list":
      return { ...n, items: n.items.map(f) };
    case "call":
      return { ...n, args: n.args.map(f) };
    case "assign":
      return { ...n, body: f(n.body) };
    default:
      return n;
  }
}
