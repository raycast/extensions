export async function validateResume(resume: unknown): Promise<{ valid: boolean; error?: unknown }> {
  try {
    if (typeof resume === "string") {
      try {
        resume = JSON.parse(resume);
      } catch {
        return { valid: false, error: new Error("Resume is not valid JSON string") };
      }
    }
    if (resume === null || typeof resume !== "object" || Array.isArray(resume)) {
      return { valid: false, error: new Error("Resume must be a JSON object") };
    }
    // Match the installed schema library's callback API; never treat a missing validator as success.
    const { validate } = await import("@jsonresume/schema");
    const resumeObject = resume;
    return await new Promise((resolve) => {
      validate(resumeObject, (errors, valid) => {
        resolve(errors || !valid ? { valid: false, error: errors } : { valid: true });
      });
    });
  } catch (error) {
    return { valid: false, error };
  }
}
