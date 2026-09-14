import { SearchSupersededError, type BlumeSearchClient, type SearchInput } from "./helperProcessClient.ts";
import type { GlobalSearchPage } from "./protocol.ts";

/** Owns one helper at a time; a later user query can recover after a terminal failure. */
export class BlumeSearchSession {
  private client: BlumeSearchClient | null = null;
  private starting: Promise<BlumeSearchClient> | null = null;
  private disposed = false;
  private searchId = 0;

  private readonly createClient: () => BlumeSearchClient;

  constructor(createClient: () => BlumeSearchClient) {
    this.createClient = createClient;
  }

  get deepLinkProtocol(): "blume" | "blume-canary" {
    return this.client?.deepLinkProtocol ?? "blume";
  }

  async ready(): Promise<void> {
    await this.getClient();
  }

  async search(input: SearchInput): Promise<GlobalSearchPage> {
    const id = ++this.searchId;
    const client = await this.getClient();
    if (id !== this.searchId) throw new SearchSupersededError();
    if (this.disposed) throw new Error("Search closed.");
    return client.search(input);
  }

  dispose(): void {
    this.disposed = true;
    this.searchId++;
    this.client?.dispose();
    this.client = null;
  }

  private async getClient(): Promise<BlumeSearchClient> {
    if (this.disposed) throw new Error("Search closed.");
    if (this.starting) return this.starting;
    if (this.client && !this.client.isClosed) return this.client;
    const client = this.createClient();
    this.client = client;
    this.starting = client.ready().then(() => {
      if (this.disposed) throw new Error("Search closed.");
      return client;
    });
    try {
      return await this.starting;
    } catch (error) {
      client.dispose();
      if (this.client === client) this.client = null;
      throw error;
    } finally {
      this.starting = null;
    }
  }
}
