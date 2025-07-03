import { GitHubUser } from "../api/github";

export function formatUserProfile(user: GitHubUser): string {
  const {
    name,
    login,
    bio,
    company,
    location,
    blog,
    twitter_username,
    followers,
    following,
    public_repos,
    created_at,
  } = user;

  // Format the date consistently using date-fns
  const createdDate = new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(new Date(created_at));
  const blogLink = blog ? `[${blog}](${blog.startsWith("http") ? blog : `https://${blog}`})` : "Not specified";
  const twitterInfo = twitter_username
    ? `[@${twitter_username}](https://twitter.com/${twitter_username})`
    : "Not specified";

  return `
## ${name || login}

${bio || "No bio provided"}

| **Basic Information** | **Value** | **Stats** | **Value** |
| --- | --- | --- | --- |
| 🏢 Company | ${company || "Not specified"} | 👥 Followers | ${followers} |
| 📍 Location | ${location || "Not specified"} | 👤 Following | ${following} |
| 🔗 Website | ${blogLink} | 📚 Repositories | ${public_repos} |
| 🐦 Twitter | ${twitterInfo} | 📅 Joined | ${createdDate} |
`;
}
