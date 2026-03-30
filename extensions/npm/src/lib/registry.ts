import { normalizeExternalUrl } from "./format";
import { RegistryPackage } from "./types";

interface RegistrySearchResponse {
  objects?: Array<{
    package: {
      name: string;
      version: string;
      description?: string;
      keywords?: string[];
      date?: string;
      publisher?: {
        username?: string;
      };
      maintainers?: Array<{
        username?: string;
      }>;
      links?: {
        npm?: string;
        repository?: string;
        homepage?: string;
      };
    };
    score?: {
      final?: number;
      detail?: {
        quality?: number;
        popularity?: number;
        maintenance?: number;
      };
    };
  }>;
}

export async function searchRegistryPackages(
  query: string,
): Promise<RegistryPackage[]> {
  const searchParams = new URLSearchParams({
    text: query,
    size: "30",
  });

  const response = await fetch(
    `https://registry.npmjs.org/-/v1/search?${searchParams.toString()}`,
  );
  if (!response.ok) {
    throw new Error(`Registry search failed with status ${response.status}.`);
  }

  const data = (await response.json()) as RegistrySearchResponse;

  return (data.objects ?? []).map(({ package: pkg, score }) => ({
    name: pkg.name,
    version: pkg.version,
    description: pkg.description,
    keywords: pkg.keywords ?? [],
    date: pkg.date,
    publisher: pkg.publisher?.username,
    maintainers: (pkg.maintainers ?? [])
      .map((maintainer) => maintainer.username ?? "")
      .filter(Boolean),
    npmUrl: pkg.links?.npm ?? `https://www.npmjs.com/package/${pkg.name}`,
    repositoryUrl: normalizeExternalUrl(pkg.links?.repository),
    homepageUrl: normalizeExternalUrl(pkg.links?.homepage),
    score: score?.final,
    quality: score?.detail?.quality,
    popularity: score?.detail?.popularity,
    maintenance: score?.detail?.maintenance,
  }));
}
