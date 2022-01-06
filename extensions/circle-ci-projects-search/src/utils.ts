export const uriToLongerSlug = (uri: string) => {
  const groups = uri.match(/https?:\/\/(?<host>[^/]+)\/(?<rest>.+$)/)?.groups;
  if (!groups) {
    throw new Error("Bad uri: " + uri);
  }

  const { host, rest } = groups;
  let slug = host;

  if (host.match("github")) {
    slug = "github";
  }

  return `${slug}/${rest}`;
};
