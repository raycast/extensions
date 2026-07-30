interface ValidateStoredCredentialInput<T> {
  isUnauthorized: (error: unknown) => boolean;
  load: () => Promise<T | null>;
  validate: (credential: T) => Promise<unknown>;
}

export const validateStoredCredential = async <T>({
  isUnauthorized,
  load,
  validate,
}: ValidateStoredCredentialInput<T>) => {
  const credential = await load();
  if (!credential) {
    return null;
  }

  try {
    await validate(credential);
    return credential;
  } catch (error) {
    if (isUnauthorized(error)) {
      return null;
    }
    throw error;
  }
};
