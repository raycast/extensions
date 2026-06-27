// Type declaration for Promise.withResolvers() — available in ES2024.
// Remove this file when TypeScript is upgraded to >=5.4.
interface PromiseWithResolvers<T> {
  promise: Promise<T>;
  resolve: (value: T | PromiseLike<T>) => void;
  reject: (reason?: unknown) => void;
}

interface PromiseConstructor {
  withResolvers<T>(): PromiseWithResolvers<T>;
}
