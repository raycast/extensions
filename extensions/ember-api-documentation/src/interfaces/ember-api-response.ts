import { ResourceObject, Response } from "ts-json-api";

interface DocumentationItem extends ResourceObject {
  id: string;
  type: "project-version";
  attributes: {
    version: string;
  };
  relationships: Record<string, Relationship>;
}

interface Relationship {
  data: {
    id: string;
    type: string;
  }[];
}

export type EmberApiResponse = Response<DocumentationItem>;
