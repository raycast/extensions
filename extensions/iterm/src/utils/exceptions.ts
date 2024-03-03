interface ExtensionErrorConstructor {
  new (data: string | Error, errorName?: string): ExtensionErrorInterface;

  isError(instance: string | ExtensionErrorInterface): instance is ExtensionErrorInterface;
  children(): ExtensionErrorConstructor[];
  errorName: string;
}

interface ExtensionErrorInterface extends Error {
  ancestor: Error | null;
  stack: string | undefined;
}

export class ExtensionError extends Error implements ExtensionErrorInterface {
  ancestor: Error | null = null;

  static children(): ExtensionErrorConstructor[] {
    return [ASEvalError, PyEvalError];
  }

  static errorName = "ExtensionError";

  constructor(data: string | Error, errorName?: string) {
    super(data instanceof Error ? data.message : data);
    const descriptor = Object.getOwnPropertyDescriptor(this, "errorName") || {};

    if (descriptor.enumerable !== false) {
      descriptor.enumerable = false;
      descriptor.writable = true;
      descriptor.value = errorName ?? ((this.constructor as typeof ExtensionError).errorName || "Error");
      Object.defineProperty(this, "name", descriptor);
    }

    if (data instanceof Error) {
      this.ancestor = data;
    }

    const currentCtor = this.constructor as ExtensionErrorConstructor;

    if (Object.hasOwnProperty.call(currentCtor, "children")) {
      for (const Child of currentCtor.children()) {
        if (Child.isError?.(this) && this.constructor !== Child) {
          return new Child(this, Child.errorName);
        }
      }
    }
  }

  get stack() {
    if (this.ancestor) {
      return this.ancestor.stack;
    }

    return super.stack;
  }

  static isError(instance: string | ExtensionErrorInterface): instance is ExtensionError {
    const currentCtor = this as typeof ExtensionError;

    if (instance.constructor === currentCtor) {
      return true;
    }

    return Boolean(currentCtor.children().find((Ctor) => Ctor.isError(instance)));
  }
}

export class ASEvalError extends ExtensionError {
  static errorName = "ASEvalError";

  static children() {
    return [ASPermissionEvalError];
  }
}

export class ASPermissionEvalError extends ASEvalError {
  static errorName = "ASPermissionEvalError";

  static isError(instance: string | ExtensionErrorInterface): instance is ASPermissionEvalError {
    const message = instance instanceof Error ? instance.message : instance;

    if (typeof message === "string") {
      // note: this needs to include the English on all platform portions of the error messages.
      // reason.indexOf(`Command failed with exit code 1: osascript -e`) !== -1;
      return message.includes("execution error: Not authorised to send Apple events to iTerm.");
    }

    return false;
  }
}

export class PyEvalError extends ExtensionError {
  static errorName = "PyEvalError";

  static children() {
    return [PyPermissionError];
  }
}

export class PyPermissionError extends PyEvalError {
  static errorName = "PyPermissionError";

  static isError(instance: string | ExtensionErrorInterface): instance is PyPermissionError {
    const message = instance instanceof Error ? instance.message : instance;

    if (typeof message === "string") {
      return message.includes(`* Ensure the Python API is enabled in iTerm2's preferences`);
    }

    return false;
  }
}

export class FinderError extends ExtensionError {
  static errorName = "FinderError";
}
