import { arxivProvider } from "./arxiv";
import { amazonMetadataProvider } from "./amazon-metadata";
import { catalogMirrorsProvider } from "./catalog-mirrors";
import { coreProvider } from "./core";
import { crossrefProvider } from "./crossref";
import { doajProvider } from "./doaj";
import { europePmcProvider } from "./europe-pmc";
import { googleBooksProvider } from "./google-books";
import { internetArchiveProvider } from "./internet-archive";
import { openLibraryProvider } from "./open-library";
import { openAlexProvider } from "./openalex";
import { projectGutenbergProvider } from "./project-gutenberg";
import { pubMedCentralProvider } from "./pubmed-central";
import { semanticScholarProvider } from "./semantic-scholar";
import { unpaywallProvider } from "./unpaywall";
import { zenodoProvider } from "./zenodo";
import type { SearchProvider } from "../types";

const PROVIDERS: SearchProvider[] = [
  amazonMetadataProvider,
  openLibraryProvider,
  crossrefProvider,
  openAlexProvider,
  europePmcProvider,
  internetArchiveProvider,
  arxivProvider,
  doajProvider,
  pubMedCentralProvider,
  projectGutenbergProvider,
  unpaywallProvider,
  googleBooksProvider,
  semanticScholarProvider,
  coreProvider,
  zenodoProvider,
  catalogMirrorsProvider,
];

export function getEnabledProviders(sourceIds: string[]): SearchProvider[] {
  const enabled = new Set(sourceIds);
  return PROVIDERS.filter((provider) => enabled.has(provider.id));
}

export {
  amazonMetadataProvider,
  arxivProvider,
  catalogMirrorsProvider,
  coreProvider,
  crossrefProvider,
  doajProvider,
  europePmcProvider,
  googleBooksProvider,
  internetArchiveProvider,
  openLibraryProvider,
  openAlexProvider,
  projectGutenbergProvider,
  pubMedCentralProvider,
  semanticScholarProvider,
  unpaywallProvider,
  zenodoProvider,
};
