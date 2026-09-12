import { Provider } from "./provider";
import { Resource } from "./resource";
import { ProviderVersion } from "./provider-version";

export function toResourceRawDocUrl(
  provider: Provider,
  version: ProviderVersion,
  resource: Resource,
) {
  return `${provider.attributes.source.replace(
    "https://github.com",
    "https://raw.githubusercontent.com",
  )}/${version.attributes.tag}/${resource.attributes.path}`;
}
export function toResourceDocUrl(
  provider: Provider,
  version: ProviderVersion,
  resource: Resource,
) {
  return `https://registry.terraform.io/providers/${provider.attributes["full-name"]}/${version.attributes.version}/docs/${resource.attributes.category}/${resource.attributes.title}`;
}

export function parseRawDoc(markdown: string): string {
  // remove YAML front matter
  return (
    markdown
      .replace(/---\s[\s\S]*---\s/g, "")
      // remove html tag content
      .replaceAll(/<("[^"]*"|'[^']*'|[^'">])*>/g, "")
  );
}
