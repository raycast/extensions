import { getPreferenceValues } from "@raycast/api";
import { ViewType } from "../components";
import { BodyFormat } from "../models";
import { encodeQueryParams } from "./query";

// Strings
export const apiAppName = "raycast_v4_0525";
export const anytypeNetwork = "N83gJpVd9MuNRZAuJLZ7LiMntTThhPc6DtzWWVjb1M3PouVU";
export const errorConnectionMessage = "Can't connect to API. Please ensure Anytype is running and reachable.";

// URLs
export const apiUrl = "http://localhost:31009";
export const downloadUrl = "https://download.anytype.io/";
export const anytypeSpaceDeeplink = (spaceId: string) => `anytype://main/object/_blank_/space.id/${spaceId}`;

// Numbers
export const currentApiVersion = "2025-05-20";
export const apiLimit = getPreferenceValues().limit;
export const apiLimitMax = 1000;
export const iconWidth = 64;
export const maxPinnedObjects = 5;

// Local Storage Keys
export const localStorageKeys = {
  appKey: "app_key",
  suffixForSpaces: "spaces",
  suffixForGlobalSearch: "global_search",
  suffixForViewsPerSpace(spaceId: string, viewType: ViewType): string {
    return `${spaceId}_${viewType}`;
  },
  pinnedObjectsWith(suffix: string): string {
    return `pinned_objects_${suffix}`;
  },
};

export const apiKeyPrefixes = {
  properties: "",
  types: "",
  tags: "",
};

// API Property/Type Keys
export const bundledPropKeys = {
  description: `${apiKeyPrefixes.properties}description`,
  type: `${apiKeyPrefixes.properties}type`,
  addedDate: `${apiKeyPrefixes.properties}added_date`,
  createdDate: `${apiKeyPrefixes.properties}created_date`,
  createdBy: `${apiKeyPrefixes.properties}creator`,
  lastModifiedDate: `${apiKeyPrefixes.properties}last_modified_date`,
  lastModifiedBy: `${apiKeyPrefixes.properties}last_modified_by`,
  lastOpenedDate: `${apiKeyPrefixes.properties}last_opened_date`,
  links: `${apiKeyPrefixes.properties}links`,
  backlinks: `${apiKeyPrefixes.properties}backlinks`,
  source: `${apiKeyPrefixes.properties}source`,
};

export const propKeys = {
  tag: `${apiKeyPrefixes.properties}tag`,
};

export const bundledTypeKeys = {
  audio: `${apiKeyPrefixes.types}audio`,
  bookmark: `${apiKeyPrefixes.types}bookmark`,
  chat: `${apiKeyPrefixes.types}chat`,
  collection: `${apiKeyPrefixes.types}collection`,
  file: `${apiKeyPrefixes.types}file`,
  note: `${apiKeyPrefixes.types}note`,
  image: `${apiKeyPrefixes.types}image`,
  object_type: `${apiKeyPrefixes.types}object_type`,
  page: `${apiKeyPrefixes.types}page`,
  participant: `${apiKeyPrefixes.types}participant`,
  profile: `${apiKeyPrefixes.types}profile`,
  set: `${apiKeyPrefixes.types}set`,
  tag: `${apiKeyPrefixes.types}tag`,
  task: `${apiKeyPrefixes.types}task`,
  template: `${apiKeyPrefixes.types}template`,
  video: `${apiKeyPrefixes.types}video`,
};

// Colors
export const colorToHex: { [key: string]: string } = {
  grey: "#b6b6b6",
  yellow: "#ecd91b",
  orange: "#ffb522",
  red: "#f55522",
  pink: "#e51ca0",
  purple: "#ab50cc",
  blue: "#3e58eb",
  ice: "#2aa7ee",
  teal: "#0fc8ba",
  lime: "#5dd400",
};
export const hexToColor: { [key: string]: string } = {
  "#b6b6b6": "grey",
  "#ecd91b": "yellow",
  "#ffb522": "orange",
  "#f55522": "red",
  "#e51ca0": "pink",
  "#ab50cc": "purple",
  "#3e58eb": "blue",
  "#2aa7ee": "ice",
  "#0fc8ba": "teal",
  "#5dd400": "lime",
};
export const defaultTintColor = { light: "black", dark: "white" };

// API Endpoints
export const apiEndpoints = {
  // auth
  displayCode: (appName: string) => ({
    url: `${apiUrl}/v1/auth/display_code?app_name=${appName}`,
    method: "POST",
  }),
  getToken: (challengeId: string, code: string) => ({
    url: `${apiUrl}/v1/auth/token?challenge_id=${challengeId}&code=${code}`,
    method: "POST",
  }),

  // lists
  getListViews: (spaceId: string, listId: string, options: { offset: number; limit: number }) => ({
    url: `${apiUrl}/v1/spaces/${spaceId}/lists/${listId}/views${encodeQueryParams(options)}`,
    method: "GET",
  }),
  getObjectsInList: (spaceId: string, listId: string, viewId: string, options: { offset: number; limit: number }) => ({
    url: `${apiUrl}/v1/spaces/${spaceId}/lists/${listId}/views/${viewId}/objects${encodeQueryParams(options)}`,
    method: "GET",
  }),
  addObjectsToList: (spaceId: string, listId: string) => ({
    url: `${apiUrl}/v1/spaces/${spaceId}/lists/${listId}/objects`,
    method: "POST",
  }),
  removeObjectsFromList: (spaceId: string, listId: string, objectId: string) => ({
    url: `${apiUrl}/v1/spaces/${spaceId}/lists/${listId}/objects/${objectId}`,
    method: "DELETE",
  }),

  // objects
  getObject: (spaceId: string, objectId: string, format: BodyFormat) => ({
    url: `${apiUrl}/v1/spaces/${spaceId}/objects/${objectId}${encodeQueryParams({ format })}`,
    method: "GET",
  }),
  getObjects: (spaceId: string, options: { offset: number; limit: number }) => ({
    url: `${apiUrl}/v1/spaces/${spaceId}/objects${encodeQueryParams(options)}`,
    method: "GET",
  }),
  createObject: (spaceId: string) => ({
    url: `${apiUrl}/v1/spaces/${spaceId}/objects`,
    method: "POST",
  }),
  updateObject: (spaceId: string, objectId: string) => ({
    url: `${apiUrl}/v1/spaces/${spaceId}/objects/${objectId}`,
    method: "PATCH",
  }),
  deleteObject: (spaceId: string, objectId: string) => ({
    url: `${apiUrl}/v1/spaces/${spaceId}/objects/${objectId}`,
    method: "DELETE",
  }),
  getExport: (spaceId: string, objectId: string, format: string) => ({
    url: `${apiUrl}/v1/spaces/${spaceId}/objects/${objectId}/${format}`,
    method: "GET",
  }),

  // properties
  getProperties: (spaceId: string, options: { offset: number; limit: number }) => ({
    url: `${apiUrl}/v1/spaces/${spaceId}/properties${encodeQueryParams(options)}`,
    method: "GET",
  }),
  getProperty: (spaceId: string, propertyId: string) => ({
    url: `${apiUrl}/v1/spaces/${spaceId}/properties/${propertyId}`,
    method: "GET",
  }),
  createProperty: (spaceId: string) => ({
    url: `${apiUrl}/v1/spaces/${spaceId}/properties`,
    method: "POST",
  }),
  updateProperty: (spaceId: string, propertyId: string) => ({
    url: `${apiUrl}/v1/spaces/${spaceId}/properties/${propertyId}`,
    method: "PATCH",
  }),
  deleteProperty: (spaceId: string, propertyId: string) => ({
    url: `${apiUrl}/v1/spaces/${spaceId}/properties/${propertyId}`,
    method: "DELETE",
  }),

  // tags
  getTags: (spaceId: string, propertyId: string, options: { offset: number; limit: number }) => ({
    url: `${apiUrl}/v1/spaces/${spaceId}/properties/${propertyId}/tags${encodeQueryParams(options)}`,
    method: "GET",
  }),
  getTag: (spaceId: string, propertyId: string, tagId: string) => ({
    url: `${apiUrl}/v1/spaces/${spaceId}/properties/${propertyId}/tags/${tagId}`,
    method: "GET",
  }),
  createTag: (spaceId: string, propertyId: string) => ({
    url: `${apiUrl}/v1/spaces/${spaceId}/properties/${propertyId}/tags`,
    method: "POST",
  }),
  updateTag: (spaceId: string, propertyId: string, tagId: string) => ({
    url: `${apiUrl}/v1/spaces/${spaceId}/properties/${propertyId}/tags/${tagId}`,
    method: "PATCH",
  }),
  deleteTag: (spaceId: string, propertyId: string, tagId: string) => ({
    url: `${apiUrl}/v1/spaces/${spaceId}/properties/${propertyId}/tags/${tagId}`,
    method: "DELETE",
  }),

  // search
  globalSearch: (options: { offset: number; limit: number }) => ({
    url: `${apiUrl}/v1/search${encodeQueryParams(options)}`,
    method: "POST",
  }),
  search: (spaceId: string, options: { offset: number; limit: number }) => ({
    url: `${apiUrl}/v1/spaces/${spaceId}/search${encodeQueryParams(options)}`,
    method: "POST",
  }),

  // spaces
  getSpace: (spaceId: string) => ({
    url: `${apiUrl}/v1/spaces/${spaceId}`,
    method: "GET",
  }),
  getSpaces: (options: { offset: number; limit: number }) => ({
    url: `${apiUrl}/v1/spaces${encodeQueryParams(options)}`,
    method: "GET",
  }),
  createSpace: {
    url: `${apiUrl}/v1/spaces`,
    method: "POST",
  },
  updateSpace: (spaceId: string) => ({
    url: `${apiUrl}/v1/spaces/${spaceId}`,
    method: "PATCH",
  }),

  // members
  getMember: (spaceId: string, objectId: string) => ({
    url: `${apiUrl}/v1/spaces/${spaceId}/members/${objectId}`,
    method: "GET",
  }),
  getMembers: (spaceId: string, options: { offset: number; limit: number }) => ({
    url: `${apiUrl}/v1/spaces/${spaceId}/members${encodeQueryParams(options)}`,
    method: "GET",
  }),
  //! Member management not enabled yet
  updateMember: (spaceId: string, objectId: string) => ({
    url: `${apiUrl}/v1/spaces/${spaceId}/members/${objectId}`,
    method: "PATCH",
  }),

  // types
  getType: (spaceId: string, typeId: string) => ({
    url: `${apiUrl}/v1/spaces/${spaceId}/types/${typeId}`,
    method: "GET",
  }),
  getTypes: (spaceId: string, options: { offset: number; limit: number }) => ({
    url: `${apiUrl}/v1/spaces/${spaceId}/types${encodeQueryParams(options)}`,
    method: "GET",
  }),
  createType: (spaceId: string) => ({
    url: `${apiUrl}/v1/spaces/${spaceId}/types`,
    method: "POST",
  }),
  updateType: (spaceId: string, typeId: string) => ({
    url: `${apiUrl}/v1/spaces/${spaceId}/types/${typeId}`,
    method: "PATCH",
  }),
  deleteType: (spaceId: string, typeId: string) => ({
    url: `${apiUrl}/v1/spaces/${spaceId}/types/${typeId}`,
    method: "DELETE",
  }),

  // templates
  getTemplate: (spaceId: string, typeId: string, templateId: string) => ({
    url: `${apiUrl}/v1/spaces/${spaceId}/types/${typeId}/templates/${templateId}`,
    method: "GET",
  }),
  getTemplates: (spaceId: string, typeId: string, options: { offset: number; limit: number }) => ({
    url: `${apiUrl}/v1/spaces/${spaceId}/types/${typeId}/templates${encodeQueryParams(options)}`,
    method: "GET",
  }),
};
