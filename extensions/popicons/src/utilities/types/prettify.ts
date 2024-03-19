// eslint-disable-next-line @typescript-eslint/ban-types
type Prettify<T> = { [K in keyof T]: T[K] } & {};

export { type Prettify };
