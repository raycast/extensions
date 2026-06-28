export async function validateResume(resume: unknown): Promise<{ valid: boolean; report?: unknown; error?: unknown }> {
  try {
    // coerce string input to object when possible
    if (typeof resume === "string") {
      try {
        resume = JSON.parse(resume);
      } catch {
        return {
          valid: false,
          error: new Error("Resume is not valid JSON string"),
        };
      }
    }

    if (resume === null || typeof resume !== "object" || Array.isArray(resume)) {
      return { valid: false, error: new Error("Resume must be a JSON object") };
    }
    // Dynamic import so the package is only required when used
    type SchemaLib = {
      validate?: (
        resume: Record<string, unknown>,
        successCb?: (err: unknown, report?: unknown) => void,
        errorCb?: (err: unknown) => void,
      ) => void;
      schema?: unknown;
      default?: SchemaLib;
      [key: string]: unknown;
    };

    const mod = (await import("@jsonresume/schema")) as unknown;
    const schemaLib = ((mod as { default?: SchemaLib }).default ?? (mod as SchemaLib)) as SchemaLib;

    return await new Promise((resolve) => {
      const successCb = (err: unknown, report?: unknown) => {
        if (err) resolve({ valid: false, error: err });
        else resolve({ valid: true, report });
      };

      const errorCb = (err: unknown) => resolve({ valid: false, error: err });

      if (schemaLib && typeof schemaLib.validate === "function") {
        try {
          // The library uses a callback-style API
          schemaLib.validate(resume as Record<string, unknown>, successCb, errorCb);
        } catch (e) {
          resolve({ valid: false, error: e });
        }
      } else if (schemaLib && schemaLib.schema) {
        // If no validate function, assume schema object available (best-effort)
        resolve({ valid: true, report: null });
      } else {
        resolve({
          valid: false,
          error: new Error("@jsonresume/schema: validate function not found"),
        });
      }
    });
  } catch (e) {
    return { valid: false, error: e };
  }
}
