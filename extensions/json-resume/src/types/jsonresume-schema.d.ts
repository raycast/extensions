declare module "@jsonresume/schema" {
  export function validate(resume: object, callback: (errors: unknown, valid: boolean) => void): void;
}
