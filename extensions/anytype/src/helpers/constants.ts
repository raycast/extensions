import { encodeQueryParams } from "./query";

// Strings
export const appName = "raycast_v1_0125";
export const apiUrl = "http://localhost:31009/v1";
export const anytypeNetwork = "N83gJpVd9MuNRZAuJLZ7LiMntTThhPc6DtzWWVjb1M3PouVU";
export const apiLimit = 50;
export const iconWidth = 32;
export const errorConnectionMessage = "Can't connect to API. Please ensure Anytype is running and reachable.";

// API Endponts
export const apiEndpoints = {
  createObject: (spaceId: string) => ({
    url: `${apiUrl}/spaces/${spaceId}/objects`,
    method: "POST",
  }),
  createSpace: {
    url: `${apiUrl}/spaces`,
    method: "POST",
  },
  deleteObject: (spaceId: string, objectId: string) => ({
    url: `${apiUrl}/spaces/${spaceId}/objects/${objectId}`,
    method: "DELETE",
  }),
  displayCode: (appName: string) => ({
    url: `${apiUrl}/auth/display_code?app_name=${appName}`,
    method: "POST",
  }),
  getExport: (spaceId: string, objectId: string, format: string) => ({
    url: `${apiUrl}/spaces/${spaceId}/objects/${objectId}/export/${format}`,
    method: "POST",
  }),
  getMembers: (spaceId: string, options: { offset: number; limit: number }) => ({
    url: `${apiUrl}/spaces/${spaceId}/members${encodeQueryParams(options)}`,
    method: "GET",
  }),
  getObjects: (spaceId: string, options: { offset: number; limit: number }) => ({
    url: `${apiUrl}/spaces/${spaceId}/objects${encodeQueryParams(options)}`,
    method: "GET",
  }),
  getSpaces: (options: { offset: number; limit: number }) => ({
    url: `${apiUrl}/spaces${encodeQueryParams(options)}`,
    method: "GET",
  }),
  getTemplates: (spaceId: string, typeId: string, options: { offset: number; limit: number }) => ({
    url: `${apiUrl}/spaces/${spaceId}/types/${typeId}/templates${encodeQueryParams(options)}`,
    method: "GET",
  }),
  getToken: (challengeId: string, code: string) => ({
    url: `${apiUrl}/auth/token?challenge_id=${challengeId}&code=${code}`,
    method: "POST",
  }),
  getTypes: (spaceId: string, options: { offset: number; limit: number }) => ({
    url: `${apiUrl}/spaces/${spaceId}/types${encodeQueryParams(options)}`,
    method: "GET",
  }),
  search: (query: string, types: string[], options: { offset: number; limit: number }) => ({
    url: `${apiUrl}/search${encodeQueryParams({ query, types, ...options })}`,
    method: "GET",
  }),
};
