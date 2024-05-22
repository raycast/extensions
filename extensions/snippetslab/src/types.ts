// export interface SnippetsResult {
//   title: string;
//   subtitle: string[];
//   icon: string;
//   quicklookurl: string;
//   "@_uid": string;
//   "@_valid": string;
//   "@_arg": string;
// }

export interface SnippetsResult {
  icon: { path: string };
  action: string;
  uid: string;
  title: string;
  subtitle: string;
}
