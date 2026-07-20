export interface SearchResult {
  id: string;
  name: string;
  attrName: string;
  description: string | null;
  version: string;
  homepage: string[];
  source: string | null;
  outputs: string[];
  defaultOutput: string | null;
  platforms: string[];
  licenses: { name: string; url: string | null }[];
}

export interface ElasticsearchResponse {
  hits: {
    hits: {
      _id: string;
      _source: {
        package_pname: string;
        package_attr_name: string;
        package_attr_set: string;
        package_outputs: string[];
        package_default_output: string | null;
        package_description: string | null;
        package_homepage: string[];
        package_pversion: string;
        package_platforms: string[];
        package_position: string;
        package_license: { fullName: string; url: string | null }[];
      };
    }[];
  };
}

export interface ElasticsearchError {
  error: { reason: string };
  status: number;
}

export interface ElasticsearchCodeError {
  code: string;
  message: string;
}
