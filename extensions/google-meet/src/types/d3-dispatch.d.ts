// Local shim to avoid type errors from incompatible @types/d3-dispatch
declare module "d3-dispatch" {
  export type Dispatch<This, EventMap> = any;
  export function dispatch<This = any, EventMap = any>(...args: any[]): Dispatch<This, EventMap>;
}
