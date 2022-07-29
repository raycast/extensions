import fetch from "node-fetch";

export interface Crate {
  name: string;
  version: string;
  downloads: number;
  documentationURL?: string;
  homepageURL?: string;
  repositoryURL?: string;
}

export async function getCrates(search: string): Promise<Crate[]> {
  if (search === "") {
    return [];
  }
  const response = await fetch("https://crates.io/api/v1/crates?page=1&per_page=100&q=" + encodeURIComponent(search));
  const json = await response.json();

  const crates: Crate[] = [];
  for (const crate of Object(json).crates) {
    crates.push({
      name: crate.name,
      version: crate.max_version,
      downloads: crate.downloads,
      documentationURL: crate.documentation,
      homepageURL: crate.homepage,
      repositoryURL: crate.repository,
    });
  }
  return crates;
}
