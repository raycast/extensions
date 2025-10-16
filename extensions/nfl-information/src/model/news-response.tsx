export interface NewsResponse {
  header: string;
  link: Link;
  articles: ArticlesItem[];
}
export interface Link {
  language: string;
  rel: string[];
  href: string;
  text: string;
  shortText: string;
  isExternal: boolean;
  isPremium: boolean;
}
export interface ArticlesItem {
  images: ImagesItem[];
  dataSourceIdentifier: string;
  description: string;
  published: string;
  type: string;
  premium: boolean;
  links: Links;
  lastModified: string;
  categories: CategoriesItem[];
  headline: string;
  byline?: string;
}
interface ImagesItem {
  name: string;
  width: number;
  alt?: string;
  caption?: string;
  url: string;
  height: number;
  dataSourceIdentifier?: string;
  id?: number;
  credit?: string;
  type?: string;
  _id?: number;
}
interface Links {
  api: Api;
  web: Web;
  mobile?: Mobile;
}
interface Api {
  news?: News;
  self?: Self;
  leagues?: Leagues;
  teams?: Teams;
  athletes?: Athletes;
}
interface News {
  href: string;
}
interface Self {
  href: string;
}
interface Web {
  href?: string;
  leagues?: Leagues;
  teams?: Teams;
  athletes?: Athletes;
}
interface CategoriesItem {
  id?: number;
  description?: string;
  type: string;
  sportId?: number;
  leagueId?: number;
  league?: League;
  uid?: string;
  createDate?: string;
  teamId?: number;
  team?: Team;
  guid?: string;
  athleteId?: number;
  athlete?: Athlete;
  topicId?: number;
}
interface League {
  id: number;
  description: string;
  links: Links;
  abbreviation?: string;
}
interface Leagues {
  href?: string;
}
interface Mobile {
  leagues?: Leagues;
  teams?: Teams;
  href?: string;
  athletes?: Athletes;
}
interface Team {
  id: number;
  description: string;
  links: Links;
}
interface Teams {
  href: string;
}
interface Athlete {
  id: number;
  description: string;
  links: Links;
}
interface Athletes {
  href: string;
}
