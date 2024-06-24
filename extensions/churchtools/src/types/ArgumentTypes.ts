// eslint-disable-next-line @typescript-eslint/ban-types, @typescript-eslint/no-explicit-any
export type ArgumentTypes<F extends Function> = F extends (...args: infer A) => any ? A : never;
