import type { Owner, Repository } from "./types";
import { Octokit } from "octokit";

export class GitHubManager {
  private octokit: Octokit;

  public constructor(token: string) {
    this.octokit = new Octokit({ auth: token });
  }

  private async getCurrentUser(): Promise<Owner> {
    const response = await this.octokit.rest.users.getAuthenticated();
    return { name: response.data.login, searchTerm: `user:${response.data.login}` } as Owner;
  }

  private async listOrganizations(): Promise<Owner[]> {
    const response = await this.octokit.rest.orgs.listForAuthenticatedUser();
    return response.data
      .map((organization) => ({ name: organization.login, searchTerm: `org:${organization.login}` } as Owner))
      .sort((a: Owner, b: Owner) => a.name.localeCompare(b.name));
  }

  public async listOwners(): Promise<Owner[]> {
    const freeSearch = { name: "Free search...", searchTerm: "" } as Owner;
    const currentUser = await this.getCurrentUser();
    const organizations = await this.listOrganizations();
    return [freeSearch, currentUser, ...organizations];
  }

  public async searchRepositories(owner: Owner, searchText: string): Promise<Repository[]> {
    if (!searchText && !owner.searchTerm) return [];
    const response = await this.octokit.rest.search.repos({ q: `${owner.searchTerm} ${searchText}` });
    return response.data.items.map(
      (repository) =>
        ({
          cloneUrl: repository.ssh_url,
          description: repository.description || "",
          name: repository.name,
          owner: repository.owner?.login,
        } as Repository)
    );
  }
}
