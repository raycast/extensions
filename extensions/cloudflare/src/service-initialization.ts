interface ServiceInitializationOptions<T> {
  currentService: T | undefined;
  personalAccessToken?: string;
  authorize: () => Promise<string>;
  initialize: (accessToken: string) => T;
}

export async function ensureServiceInitialized<T>({
  currentService,
  personalAccessToken,
  authorize,
  initialize,
}: ServiceInitializationOptions<T>): Promise<T> {
  if (currentService) return currentService;

  const accessToken = personalAccessToken ?? (await authorize());
  return initialize(accessToken);
}
