type Color = {
  hex: string;
  name: string;
};
type Resolution = {
  width: number;
  height: number;
};
type Logo = {
  url: string;
  mode: "dark" | "light" | "has_opaque_background";
  group: number;
  colors: Color[];
  resolution: Resolution;
};
type Backdrop = {
  url: string;
  colors: Color[];
  resolution: Resolution;
};
type Social = {
  type: string;
  url: string;
};
type Address = {
  street?: string;
  city?: string;
  country?: string;
  country_code?: string;
  state_province?: string;
  state_code?: string;
  postal_code?: string;
  additional_info?: string;
};
type Stock = {
  ticker: string;
  exchange: string;
};
type Font = {
  usage: string;
  name: string;
};
type EIC = {
  industry: string;
  subindustry: string;
};
export type Brand = {
  domain: string;
  title: string | null;
  description: string | null;
  slogan: string | null;
  colors: Color[];
  logos: Logo[];
  backdrops: Backdrop[];
  socials: Social[];
  address: Address | null;
  stock: Stock | null;
  fonts: Font[];
  email: string | null;
  phone: string | null;
  is_nsfw?: boolean;
  industries?: {
    eic: EIC[];
  };
  links?: {
    careers: string | null;
    terms: string | null;
    contact: string | null;
    privacy: string | null;
    blog: string | null;
    pricing: string | null;
  };
};
