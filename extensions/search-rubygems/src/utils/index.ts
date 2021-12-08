import type { GemDetailResponse, GemSearchResult } from '../rubygems/types';
export const mapGemLinks = (gem: GemDetailResponse | GemSearchResult) => {

  const sortByTitle = (a: { title: string }, b: { title: string }) => {
    if (a.title.toLowerCase() < b.title.toLowerCase()) return -1;
    if (a.title.toLowerCase() > b.title.toLowerCase()) return 1;
    return 0;
  }

  const cleanTitle = (title: string) => {
    return title
      .replace(/_/g, ' ')
      .replace(/uri$/, '');
  }

  const uriAttributes = Object.keys(gem).filter(key => key.match('uri'));
  return uriAttributes
    .map(attr => ({ title: cleanTitle(attr), link: (gem[attr] as string) }))
    .sort((a, b) => sortByTitle(a, b))
    .filter(link => link['link']);
}
