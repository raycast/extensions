import { getPreferenceValues } from "@raycast/api";

export const integrationIconURL = (integrationId: string) => ({
  source: `https://static.resmo.com/integrations/icons/${integrationId}.svg`,
  fallback: "fallback.png",
});

export const getDomain = () => {
  const tmpDomain = `${getPreferenceValues().resmoDomain.trim()}`;
  const resmoDomain = tmpDomain.endsWith("/") ? tmpDomain : tmpDomain + "/";
  return resmoDomain;
};
export const getApiKey = () => {
  const resmoApiKey = `${getPreferenceValues().resmoApiKey.trim()}`;
  return resmoApiKey;
};

type Result = Record<string, string | number | unknown> & Partial<MetaType>;

export interface MetaType {
  _meta: {
    type: string;
    id: string;
    recordId: string;
    groupKey: string;
    integration: {
      id: string;
      name: string;
      type: string;
      tags: string[];
    };
    recordedAt: string;
    complianceStatus: {
      COMPLIANT: number;
      NON_COMPLIANT: number;
      SUPPRESSED: number;
    };
    resourceGroups: {
      id: string;
      name: string;
      slug: string;
    }[];
    riskScore: number;
    name: string;
  };
}

export type SearchResponse = {
  results: Result[];
  resultType: "JSON" | "TABLE";
  id: string;
  duration: number;
  fields: Record<string, unknown>[];
  error?: string;
};

export interface ResourceRow extends MetaType {
  name: string;
  referencedType: string;
}
export interface Resources {
  rows: ResourceRow[];
  fields: {
    name: string;
    type: string;
    isImportant: boolean;
  }[];
}

interface MetadataIntegration {
  description: string;
  name: string;
}
export interface Metadata {
  integrations: Record<string, MetadataIntegration>;
}

export interface Resource {
  row: Record<string, null | object | string | number>;
  rawRow: Record<string, null | object | string | number>;
  fields: {
    name: string;
    type: string;
    isImportant: boolean;
  }[];
  resourceLink?: string;
  resourceName: string;
  resourceGroups: {
    id: string;
    name: string;
    slug: string;
  }[];
  latestAvailableChangeType: "ADDED" | "MODIFIED" | "REMOVED";
  latestAvailableRecordId: string;
  isLatest: boolean;
}
