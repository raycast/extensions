export interface ProfilesResponse {
  body: Body;
  success: boolean;
}
interface Body {
  profiles: ProfilesItem[];
}
export interface ProfilesItem {
  PK: string | number;
  updated: number;
  name: string;
  profile: Profile;
}
interface Profile {
  flt: Flt;
  cflt: Cflt;
  ipflt: Ipflt;
  rule: Rule;
  svc: Svc;
  grp: Grp;
  opt: Opt;
  da: Da | any[];
}
interface Flt {
  count: number;
}
interface Cflt {
  count: number;
}
interface Ipflt {
  count: number;
}
interface Rule {
  count: number;
}
interface Svc {
  count: number;
}
interface Grp {
  count: number;
}
interface Opt {
  count: number;
  data: DataItem[];
}
interface DataItem {
  PK: string;
  value: number;
}
interface Da {
  do: number;
  via: string;
  status: number;
}
