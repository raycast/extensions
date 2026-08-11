/**
 * Type definitions and Zod schemas for RHTTP
 *
 * This file contains all runtime validation schemas (Zod) and their corresponding
 * TypeScript types. Schemas are used for data validation, serialization, and
 * ensuring type safety throughout the application.
 */

import { z } from "zod";
import { METHODS } from "./constants";

// =============================================================================
// HTTP METHOD
// =============================================================================

const methodKeys = Object.keys(METHODS) as [keyof typeof METHODS, ...Array<keyof typeof METHODS>];

/** Schema for HTTP methods (GET, POST, PUT, PATCH, DELETE, GRAPHQL). */
export const methodSchema = z.enum(methodKeys);
export type Method = z.infer<typeof methodSchema>;

// =============================================================================
// HEADERS
// =============================================================================

/** Schema for a single HTTP header (key-value pair). */
export const headerSchema = z.object({
  key: z.string().min(1, "Header key cannot be empty"),
  value: z.string(),
});

/** Schema for an array of HTTP headers. */
export const headersSchema = z.array(headerSchema).default([]);
export type Headers = z.infer<typeof headersSchema>;

/** Schema for headers as a key-value object. */
export const headersObjectSchema = z.record(z.string(), z.string());
export type HeadersObject = z.infer<typeof headersObjectSchema>;

// =============================================================================
// COOKIES
// =============================================================================

/** Schema for cookie options (maxAge, path, domain, etc.). */
export const cookieOptionsSchema = z.object({
  maxAge: z.number().optional(),
  path: z.string().optional(),
  domain: z.string().optional(),
  expires: z.date().optional(),
  httpOnly: z.boolean().default(false),
  secure: z.boolean().optional(),
  sameSite: z
    .union([
      z.boolean(),
      z.string().transform((val) => val.toLowerCase()), // ✅ Convert to lowercase
    ])
    .pipe(z.union([z.boolean(), z.enum(["lax", "strict", "none"])])) // ✅ Then validate
    .optional(),
});
export type CookieOptions = z.infer<typeof cookieOptionsSchema>;

/** Schema for a parsed cookie with name, value, and options. */
export const parsedCookieSchema = z.object({
  cookieName: z.string(),
  cookieValue: z.string(),
  options: cookieOptionsSchema,
});
export type ParsedCookie = z.infer<typeof parsedCookieSchema>;

/** Schema for the cookie store, grouped by domain. */
export const cookiesSchema = z.record(z.string(), z.array(parsedCookieSchema));
export type Cookies = z.infer<typeof cookiesSchema>;

// =============================================================================
// REQUEST ACTIONS
// =============================================================================

/** Schema for response actions (extract data from responses). */
export const responseActionSchema = z.object({
  id: z.uuid(),
  source: z.enum(["BODY_JSON", "HEADER"]),
  sourcePath: z.string(),
  variableKey: z.string(),
  storage: z.enum(["TEMPORARY", "ENVIRONMENT"]).default("TEMPORARY"),
});
export type ResponseAction = z.infer<typeof responseActionSchema>;

/** Schema for pre-request actions (run requests before main request). */
export const preRequestActionSchema = z.object({
  id: z.uuid(),
  requestId: z.uuid(),
  enabled: z.boolean().default(true),
});
export type PreRequestAction = z.infer<typeof preRequestActionSchema>;

// =============================================================================
// REQUESTS
// =============================================================================

/** Base schema for requests (without ID). */
const baseRequestSchema = z.object({
  method: methodSchema,
  url: z.string(),
  title: z.string().optional(),
  bodyType: z.enum(["NONE", "JSON", "FORM_DATA"]).optional().default("NONE"),
  body: z.string().optional(),
  params: z.string().optional(),
  query: z.string().optional(),
  variables: z.string().optional(),
  headers: headersSchema,
  responseActions: z.array(responseActionSchema).optional(),
  preRequestActions: z.array(preRequestActionSchema).optional(),
});

/** Custom validation for request bodies. */
const requestValidation = (data: z.infer<typeof baseRequestSchema>, ctx: z.RefinementCtx) => {
  if (data.bodyType === "JSON" && data.body) {
    try {
      JSON.parse(data.body);
    } catch {
      ctx.addIssue({ path: ["body"], code: "custom", message: "Must be a valid JSON string" });
    }
  }
  if (data.bodyType === "FORM_DATA" && data.body) {
    try {
      z.array(z.object({ key: z.string(), value: z.string() })).parse(JSON.parse(data.body));
    } catch {
      ctx.addIssue({ path: ["body"], code: "custom", message: "Must be a valid JSON array of key-value pairs" });
    }
  }
};

/** Schema for a complete request (with ID). */
export const requestSchema = baseRequestSchema.extend({ id: z.uuid() }).superRefine(requestValidation);
export type Request = z.infer<typeof requestSchema>;

/** Schema for creating a new request (without ID). */
export const newRequestSchema = baseRequestSchema.superRefine(requestValidation);
export type NewRequest = z.infer<typeof newRequestSchema>;

// =============================================================================
// COLLECTIONS
// =============================================================================

/** Schema for a collection of requests. */
export const collectionSchema = z.object({
  id: z.uuid(),
  title: z.string(),
  requests: z.array(requestSchema),
  headers: headersSchema,
  lastActiveEnvironmentId: z.uuid().nullable().optional().default(null),
});
export type Collection = z.infer<typeof collectionSchema>;

/** Schema for creating a new collection (without ID). */
export const newCollectionSchema = collectionSchema.omit({ id: true });
export type NewCollection = z.infer<typeof newCollectionSchema>;

// =============================================================================
// ENVIRONMENTS & VARIABLES
// =============================================================================

/** Schema for a single variable (value + secret flag). */
export const variableSchema = z.object({
  value: z.string(),
  isSecret: z.boolean().default(false),
});
export type Variable = z.infer<typeof variableSchema>;

/** Schema for a collection of variables (key-value pairs). */
export const variablesSchema = z.record(z.string(), variableSchema);
export type Variables = z.infer<typeof variablesSchema>;

/** Schema for an environment (contains variables). */
export const environmentSchema = z.object({
  id: z.uuid(),
  name: z.string(),
  variables: variablesSchema,
});
export type Environment = z.infer<typeof environmentSchema>;

/** Schema for an array of environments. */
export const environmentsSchema = z.array(environmentSchema);

// =============================================================================
// HISTORY
// =============================================================================

/** Schema for response data saved in history. */
export const responseDataSchema = z.object({
  requestMethod: methodSchema,
  requestUrl: z.string(),
  status: z.number(),
  statusText: z.string(),
  headers: z.record(z.string(), z.union([z.string(), z.array(z.string())])),
  body: z.unknown(),
});
export type ResponseData = z.infer<typeof responseDataSchema>;

/** Schema for a single history entry. */
export const historyEntrySchema = z.object({
  id: z.uuid(),
  createdAt: z.coerce.date(),
  requestSnapshot: newRequestSchema,
  sourceRequestId: z.uuid().optional(),
  response: responseDataSchema,
  activeEnvironmentId: z.uuid().optional(),
});
export type HistoryEntry = z.infer<typeof historyEntrySchema>;

/** Schema for the history array. */
export const historySchema = z.array(historyEntrySchema);
