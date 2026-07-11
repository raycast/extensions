import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { runSfBrowserCommand, runSfJson, runSfRaw, runSfRest } from "./cli";
import { escapeSoslTerm, sanitizeFileName } from "./format";
import { getPreferences } from "./preferences";
import { clearCachedDescribe, getCachedDescribe, setCachedDescribe } from "./storage";
import {
  DescribeResult,
  QueryRequest,
  QueryResult,
  SalesforceOrg,
  SalesforceRecord,
  SearchObjectConfig,
  SearchResult,
} from "./types";

const API_NAME = /^[A-Za-z][A-Za-z0-9_]*$/;

export async function runQuery(request: QueryRequest): Promise<QueryResult> {
  const args = ["data", "query", "--query", request.soql, "--target-org", request.alias];
  if (request.toolingApi) args.push("--use-tooling-api");
  if (request.allRows) args.push("--all-rows");
  return runSfJson<QueryResult>(args);
}

export function buildSosl(term: string, objects: SearchObjectConfig[], perObjectLimit = 20): string {
  const returning = objects
    .filter((config) => API_NAME.test(config.apiName))
    .map((config) => {
      const fields = config.fields.filter((field) => /^[A-Za-z][A-Za-z0-9_.]*$/.test(field));
      return `${config.apiName}(${fields.join(", ")} LIMIT ${perObjectLimit})`;
    });
  if (!returning.length) throw new Error("No valid Salesforce search objects are configured.");
  return `FIND {${escapeSoslTerm(term)}} IN ALL FIELDS RETURNING ${returning.join(", ")}`;
}

export async function searchRecords(
  org: SalesforceOrg,
  term: string,
  objects: SearchObjectConfig[],
): Promise<SalesforceRecord[]> {
  const result = await runSfJson<SearchResult>([
    "data",
    "search",
    "--query",
    buildSosl(term, objects),
    "--target-org",
    org.alias,
  ]);
  return result.searchRecords ?? [];
}

export async function describeObject(
  org: SalesforceOrg,
  objectApiName: string,
  forceRefresh = false,
): Promise<DescribeResult> {
  validateApiName(objectApiName);
  if (forceRefresh) await clearCachedDescribe(org.orgId, org.instanceApiVersion, objectApiName);
  const cached = await getCachedDescribe(org.orgId, org.instanceApiVersion, objectApiName);
  if (cached) return cached;
  const describe = await runSfJson<DescribeResult>([
    "sobject",
    "describe",
    "--sobject",
    objectApiName,
    "--target-org",
    org.alias,
  ]);
  await setCachedDescribe(org.orgId, org.instanceApiVersion, describe);
  return describe;
}

export async function getRecord(
  org: SalesforceOrg,
  objectApiName: string,
  recordId: string,
): Promise<SalesforceRecord> {
  validateApiName(objectApiName);
  validateRecordId(recordId);
  return runSfJson<SalesforceRecord>([
    "data",
    "get",
    "record",
    "--sobject",
    objectApiName,
    "--record-id",
    recordId,
    "--target-org",
    org.alias,
  ]);
}

export async function createRecord(
  org: SalesforceOrg,
  objectApiName: string,
  fields: Record<string, unknown>,
): Promise<{ id: string; success: boolean; errors?: unknown[] }> {
  validateApiName(objectApiName);
  return (
    (await runSfRest<{ id: string; success: boolean; errors?: unknown[] }>(
      org.alias,
      "POST",
      apiPath(org, objectApiName),
      fields,
    )) ?? { id: "", success: true }
  );
}

export async function updateRecord(
  org: SalesforceOrg,
  objectApiName: string,
  recordId: string,
  fields: Record<string, unknown>,
): Promise<void> {
  validateApiName(objectApiName);
  validateRecordId(recordId);
  await runSfRest(org.alias, "PATCH", apiPath(org, objectApiName, recordId), fields);
}

export async function deleteRecord(org: SalesforceOrg, objectApiName: string, recordId: string): Promise<void> {
  validateApiName(objectApiName);
  validateRecordId(recordId);
  await runSfRest(org.alias, "DELETE", apiPath(org, objectApiName, recordId));
}

export async function openOrgPath(org: SalesforceOrg, destination = "/lightning/page/home"): Promise<void> {
  if (!destination.startsWith("/")) throw new Error("Salesforce navigation paths must be relative org paths.");
  const args = ["org", "open", "--target-org", org.alias, "--path", destination];
  const browser = getPreferences().preferredBrowser;
  if (browser !== "default") args.push("--browser", browser);
  await runSfBrowserCommand(args, 30_000);
}

export async function openRecord(org: SalesforceOrg, objectApiName: string, recordId: string): Promise<void> {
  validateApiName(objectApiName);
  validateRecordId(recordId);
  await openOrgPath(org, `/lightning/r/${encodeURIComponent(objectApiName)}/${encodeURIComponent(recordId)}/view`);
}

export async function loginOrg(instanceUrl: string, alias: string): Promise<void> {
  const args = ["org", "login", "web", "--instance-url", instanceUrl, "--alias", alias];
  const browser = getPreferences().preferredBrowser;
  if (browser !== "default") args.push("--browser", browser);
  await runSfBrowserCommand(args);
}

export async function resolveRecordObjectNames(org: SalesforceOrg, recordId: string): Promise<string[]> {
  validateRecordId(recordId);
  const prefix = recordId.slice(0, 3);
  const result = await runQuery({
    orgId: org.orgId,
    alias: org.alias,
    soql: `SELECT QualifiedApiName FROM EntityDefinition WHERE KeyPrefix = '${prefix}' ORDER BY QualifiedApiName`,
    toolingApi: false,
    allRows: false,
  });
  return result.records
    .map((record) => record.QualifiedApiName)
    .filter((name): name is string => typeof name === "string" && API_NAME.test(name));
}

export async function exportQuery(request: QueryRequest): Promise<string> {
  const preferences = getPreferences();
  await mkdir(preferences.exportDirectory, { recursive: true });
  const fileName = `${sanitizeFileName(request.alias)}-soql-${new Date().toISOString().replace(/[:.]/g, "-")}.csv`;
  const outputPath = path.join(preferences.exportDirectory, fileName);
  const args = [
    "data",
    "query",
    "--query",
    request.soql,
    "--target-org",
    request.alias,
    "--result-format",
    "csv",
    "--output-file",
    outputPath,
  ];
  if (request.toolingApi) args.push("--use-tooling-api");
  if (request.allRows) args.push("--all-rows");
  await runSfRaw(args, { timeoutMs: 5 * 60_000, maxBuffer: 5 * 1024 * 1024 });
  return outputPath;
}

export async function writeCsvFile(fileName: string, contents: string): Promise<string> {
  const directory = getPreferences().exportDirectory;
  await mkdir(directory, { recursive: true });
  const output = path.join(directory, sanitizeFileName(fileName));
  await writeFile(output, contents, "utf8");
  return output;
}

function apiPath(org: SalesforceOrg, objectApiName: string, recordId?: string): string {
  const base = `/services/data/v${org.instanceApiVersion}/sobjects/${encodeURIComponent(objectApiName)}`;
  return recordId ? `${base}/${encodeURIComponent(recordId)}` : base;
}

export function validateApiName(value: string): void {
  if (!API_NAME.test(value)) throw new Error(`Invalid Salesforce API name: ${value}`);
}

export function validateRecordId(value: string): void {
  if (!/^[A-Za-z0-9]{15}(?:[A-Za-z0-9]{3})?$/.test(value))
    throw new Error("Salesforce record IDs must be 15 or 18 alphanumeric characters.");
}
