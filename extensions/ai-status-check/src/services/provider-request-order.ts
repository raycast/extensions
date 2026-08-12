export type ProviderRequestToken = number;

export class ProviderRequestOrder {
  readonly #latest = new Map<string, ProviderRequestToken>();

  begin(providerId: string): ProviderRequestToken {
    const token = (this.#latest.get(providerId) ?? 0) + 1;
    this.#latest.set(providerId, token);
    return token;
  }

  isCurrent(providerId: string, token: ProviderRequestToken | undefined): boolean {
    return token !== undefined && this.#latest.get(providerId) === token;
  }
}
