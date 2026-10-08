// https://github.com/microsoft/TypeScript/blob/main/src/lib/es2022.error.d.ts
interface ErrorOptions {
  cause?: unknown;
}

interface Error {
  cause?: unknown;
}

interface ErrorConstructor {
  new (message?: string, options?: ErrorOptions): Error;
  (message?: string, options?: ErrorOptions): Error;
}

// eslint-disable-next-line @typescript-eslint/no-unsafe-function-type
type Constructor<T> = Function & { prototype: T };
