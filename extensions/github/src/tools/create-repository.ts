import { createRepository, getCloneUrl, getViewerLogin } from "../helpers/create-repository";
import { withGitHubClient } from "../helpers/withGithubClient";

type Input = {
  /**
   * The name of the repository to create, without the owner (e.g. "my-project", not "octocat/my-project").
   */
  name: string;

  /**
   * A short description of the repository.
   */
  description?: string;

  /**
   * Whether the repository is private. Defaults to true. Only set it to false when the user explicitly asks for a public repository.
   */
  private?: boolean;

  /**
   * The login of the organization that will own the repository. Omit it to create the repository on the authenticated user's personal account.
   */
  owner?: string;

  /**
   * Whether to create an initial commit with an empty README. Defaults to false.
   */
  autoInit?: boolean;
};

/**
 * Create a new GitHub repository on the user's personal account or in one of their organizations.
 * Returns the created repository's full name, web URL and clone URL.
 */
export default withGitHubClient(async (input: Input) => {
  const owner = input.owner || (await getViewerLogin());

  const repository = await createRepository({
    name: input.name,
    description: input.description,
    isPrivate: input.private ?? true,
    owner,
    autoInit: input.autoInit ?? false,
  });

  return {
    fullName: repository.full_name,
    url: repository.html_url,
    cloneUrl: getCloneUrl(repository),
    private: repository.private,
  };
});

export const confirmation = withGitHubClient(async (input: Input) => {
  const owner = input.owner || (await getViewerLogin());

  return {
    message: `Are you sure you want to create this repository?`,
    info: [
      { name: "Name", value: input.name },
      { name: "Owner", value: owner },
      { name: "Visibility", value: (input.private ?? true) ? "Private" : "Public" },
    ],
  };
});
