export interface FastGPTResponse {
  meta: Meta;
  data: Data;
}
interface Meta {
  id: string;
  node: string;
  ms: number;
}
interface Data {
  to: number;
  references?: ReferencesItem[];
  tokens: number;
  output: string;
}
export interface ReferencesItem {
  title: string;
  snippet: string;
  url: string;
}
