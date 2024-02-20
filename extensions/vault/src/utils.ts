import NodeVault from "node-vault";
import {
  DeleteMode,
  ExportMode,
  VAULT_NAMESPACE_CACHE_KEY,
  VAULT_SECRET_ENGINE_CACHE_KEY,
  VAULT_TOKEN_CACHE_KEY,
  VaultAuthUrlResponse,
  VaultEntity,
  VaultListEntry,
  VaultLoginResponse,
  VaultMetaDataResponse,
  VaultMount,
  VaultReadMetadataResponse,
  VaultReadResponse,
  VaultTokenCache,
  VaultVersion,
} from "./interfaces";
import got from "got";
import { Cache, Form, getPreferenceValues, LocalStorage, open, showToast, Toast } from "@raycast/api";
import * as oauthService from "./oauth.service";
import { homedir } from "os";
import fs from "fs";
import hdate from "human-date";
import Values = Form.Values;

const NO_NAMESPACE = "<EMPTY>";

const preferences = getPreferenceValues<Preferences.Vault>();
const vaultUrl = preferences.url.replace(/\/$/, "");
const cache = new Cache();

export function writeEnabled(): boolean {
  return preferences.enableWrite || true;
}

export function deleteEnabled(): boolean {
  return preferences.enableDelete || false;
}

export function stringify(value: object) {
  return JSON.stringify(value, undefined, 2);
}

export function duration(date: string) {
  if (date === "") {
    return;
  }
  return hdate.relativeTime(date);
}

export function getVaultUrl(): string {
  return vaultUrl;
}

export function getVaultNamespaceConfiguration(): string | null | undefined {
  return cache.get(VAULT_NAMESPACE_CACHE_KEY);
}

export function getVaultNamespace(): string {
  const namespaceInCache = cache.get(VAULT_NAMESPACE_CACHE_KEY);
  if (!namespaceInCache || namespaceInCache === NO_NAMESPACE) {
    return "";
  }
  return namespaceInCache;
}

export async function setVaultNamespace(newNamespace: string) {
  const newNamespaceInCache = newNamespace === "" ? NO_NAMESPACE : newNamespace;
  cache.set(VAULT_NAMESPACE_CACHE_KEY, newNamespaceInCache);
  // remove cached token as namespace changes
  cache.remove(VAULT_TOKEN_CACHE_KEY);
  if (preferences.loginMethod === "oidc") {
    await oauthService.clearTokens();
  }
}

export function setSecretEngine(secretEngine: string) {
  cache.set(VAULT_SECRET_ENGINE_CACHE_KEY, secretEngine);
}

export function getSecretEngine(): string {
  const secretEngineInCache = cache.get(VAULT_SECRET_ENGINE_CACHE_KEY);
  if (!secretEngineInCache) {
    return preferences.secretEngine;
  }
  return secretEngineInCache;
}

export function getTechnicalPaths(): string[] {
  return preferences.technicalPaths ? preferences.technicalPaths.split(" ") : [];
}

export function getFavoriteNamespaces(): string[] {
  return preferences.favoriteNamespaces ? preferences.favoriteNamespaces.split(" ") : [];
}

export async function getUserToken(): Promise<string> {
  if (preferences.loginMethod === "oidc") {
    return await oauthService.authorize();
  }
  const tokenCache = parseTokenFromCache();
  return tokenCache ? tokenCache.token : "";
}

export function parseTokenFromCache(): VaultTokenCache | undefined {
  const tokenCacheString = cache.get(VAULT_TOKEN_CACHE_KEY);
  if (tokenCacheString) {
    return JSON.parse(tokenCacheString) as VaultTokenCache;
  }
}

function nothingFound(error: any) {
  return error?.response?.statusCode === 404 && error?.response?.body?.errors?.length === 0;
}

export class ConfigurationError extends Error {}

export async function getVaultClient(): Promise<NodeVault.client> {
  let tokenCache = parseTokenFromCache();

  // check cache expiration
  if (tokenCache) {
    if (Date.now() > tokenCache.expiration) {
      // token expired, removing from cache
      cache.remove(VAULT_TOKEN_CACHE_KEY);
      console.info("Token expired, removing from cache");
      tokenCache = undefined;
    }
  }

  // get token if needed
  let token;
  if (tokenCache) {
    token = tokenCache.token;
  } else {
    if (preferences.loginMethod === "ldap") {
      if (!preferences.ldap || !preferences.password) {
        throw new ConfigurationError("Ldap method needs ldap and password to be set in preferences");
      }
      console.info("Login with ldap...");
      const body = await callLoginWithLdap();
      // set token cache
      tokenCache = {
        token: body.auth.client_token,
        expiration: Date.now() + body.auth.lease_duration * 1000,
      };
      // and save it
      cache.set(VAULT_TOKEN_CACHE_KEY, JSON.stringify(tokenCache));
      console.info("Logged successfully, saving token in cache");
      token = tokenCache.token;
    } else if (preferences.loginMethod === "token") {
      if (!preferences.token) {
        throw new ConfigurationError("Token method needs token to be set in preferences");
      }
      token = preferences.token;
    } else if (preferences.loginMethod === "oidc") {
      token = await oauthService.authorize();
    } else {
      throw new Error("Unknown login method");
    }
  }

  // return node vault client
  return NodeVault({
    apiVersion: "v1",
    endpoint: getVaultUrl(),
    namespace: getVaultNamespace(),
    token: token,
    noCustomHTTPVerbs: true,
  });
}

function env(secret: any): string {
  let result = "";
  for (const key of Object.keys(secret)) {
    result += key + "=" + secret[key] + "\n";
  }
  return result;
}

export async function exportSecretToFile(secret: object, path: string, mode: ExportMode) {
  const toast = await showToast({
    style: Toast.Style.Animated,
    title: "Saving secret",
  });
  if (secret) {
    const filePath = `${homedir()}/Downloads/secret${path.replaceAll("/", "_")}.${mode}`;
    const content = mode === ExportMode.json ? stringify(secret) : env(secret);
    fs.writeFile(filePath, content, async (err) => {
      if (err) {
        toast.style = Toast.Style.Failure;
        toast.message = "Failed to save secret to " + filePath + "\n" + String(err);
      } else {
        toast.style = Toast.Style.Success;
        toast.message = "Secret saved to " + filePath;
        await open(filePath);
      }
    });
  } else {
    toast.style = Toast.Style.Failure;
    toast.message = "Nothing to save";
  }
}

export async function callTree(path: string): Promise<VaultListEntry[]> {
  console.info("Calling tree", path);
  try {
    const response = await (await getVaultClient()).list(getSecretEngine() + "/metadata" + path, {});
    const favorites = (await listFavorites()).map(({ key }) => key);
    return response.data.keys.map((key: string) => ({
      key: path + key,
      label: key,
      folder: key.endsWith("/"),
      favorite: favorites.includes(path + key),
    }));
  } catch (error) {
    console.log(">>>", error);
    if (nothingFound(error)) {
      return [];
    }
    throw error;
  }
}

export async function callRead(path: string): Promise<VaultReadResponse> {
  console.info("Calling read", path);
  const response = await (await getVaultClient()).read(getSecretEngine() + "/data" + path, {});
  return response.data;
}

export async function callReadMetadata(path: string): Promise<VaultReadMetadataResponse> {
  console.info("Calling read metadata", path);
  const response = await (await getVaultClient()).read(getSecretEngine() + "/metadata" + path, {});
  let currentVersion: VaultVersion | undefined;
  const versions = Object.getOwnPropertyNames(response.data.versions)
    .map((versionStr) => {
      const version = parseInt(versionStr, 10);
      const tmp = response.data.versions[version];
      const result: VaultVersion = {
        version: version,
        created_time: tmp.created_time,
        deletion_time: tmp.deletion_time,
        destroyed: tmp.destroyed,
        deleted: tmp.deletion_time !== "",
      };
      if (response.data.current_version === version) {
        currentVersion = result;
      }
      return result;
    })
    .sort((a, b) => b.version - a.version);
  if (!currentVersion) {
    throw new Error("Could not find current version in versions list");
  }
  return {
    current_version: currentVersion,
    versions: versions,
  };
}

export async function callWrite(path: string, newSecret: object): Promise<VaultMetaDataResponse> {
  console.info("Calling write", path);
  const response = await (await getVaultClient()).write(getSecretEngine() + "/data" + path, { data: newSecret }, {});
  return response.data;
}

export async function callDelete(path: string, deleteMode: DeleteMode, version?: number) {
  console.info("Calling delete", path, deleteMode);
  if (deleteMode === DeleteMode.deleteVersion) {
    await (await getVaultClient()).delete(getSecretEngine() + "/data" + path, {});
  } else if (deleteMode === DeleteMode.destroyVersion) {
    if (!version) {
      throw new Error("Version is mandatory to destroy specific version");
    }
    await (
      await getVaultClient()
    ).request({
      path: "/" + getSecretEngine() + "/destroy" + path,
      method: "POST",
      json: {
        versions: [version],
      },
    });
  } else if (deleteMode === DeleteMode.destroyAllVersions) {
    await (await getVaultClient()).delete(getSecretEngine() + "/metadata" + path, {});
  }
}

export async function callUndelete(path: string, version?: number) {
  console.info("Calling undelete", path);
  if (!version) {
    throw new Error("Version is mandatory to undelete specific version");
  }
  await (
    await getVaultClient()
  ).request({
    path: "/" + getSecretEngine() + "/undelete" + path,
    method: "POST",
    json: {
      versions: [version],
    },
  });
}

export async function callListEntities(): Promise<string[]> {
  console.info("Calling list entities");
  try {
    const response = await (
      await getVaultClient()
    ).request({
      path: "/identity/entity/id",
      method: "LIST",
    });
    return response.data.keys;
  } catch (error) {
    if (nothingFound(error)) {
      return [];
    }
    throw error;
  }
}

export async function callGetEntity(entityId: string): Promise<VaultEntity> {
  const response = await (
    await getVaultClient()
  ).request({
    path: "/identity/entity/id/" + entityId,
    method: "GET",
  });
  return response.data;
}

export async function callDeleteEntity(entityId: string) {
  await (
    await getVaultClient()
  ).request({
    path: "/identity/entity/id/" + entityId,
    method: "DELETE",
  });
}

export async function callCreateEntity(name: string, policies: string[]) {
  console.info("Creating entity for name: ", name);
  const response = await (
    await getVaultClient()
  ).request({
    path: "/identity/entity",
    method: "POST",
    json: {
      name: name,
      policies: policies,
    },
  });
  return response.data.id;
}

export async function callCreateAlias(entityId: string, aliasName: string, aliasMountAccessor: string) {
  console.info("Creating alias for entity: ", entityId);
  await (
    await getVaultClient()
  ).request({
    path: "/identity/entity-alias",
    method: "POST",
    json: {
      canonical_id: entityId,
      name: aliasName,
      mount_accessor: aliasMountAccessor,
    },
  });
}

export async function callGetSysAuth(): Promise<VaultMount[]> {
  const response = await (
    await getVaultClient()
  ).request({
    path: "/sys/auth",
    method: "GET",
  });
  return Object.keys(response.data).map((name) => ({
    name: name.substring(0, name.length - 1),
    type: response.data[name].type,
    description: response.data[name].description,
    accessor: response.data[name].accessor,
  }));
}

export async function callGetPolicies(): Promise<string[]> {
  const response = await (
    await getVaultClient()
  ).request({
    path: "/sys/policies/acl",
    method: "LIST",
  });
  return response.data.keys;
}

export async function callGetSysMounts(): Promise<VaultMount[]> {
  const response = await (
    await getVaultClient()
  ).request({
    path: "/sys/mounts",
    method: "GET",
  });
  return Object.keys(response.data)
    .map((name) => ({
      name: name.substring(0, name.length - 1),
      type: response.data[name].type,
      description: response.data[name].description,
      accessor: response.data[name].accessor,
    }))
    .filter((mount) => mount.type === "kv")
    .sort((a, b) => a.name.localeCompare(b.name));
}

export async function callLoginWithLdap(): Promise<VaultLoginResponse> {
  return got
    .post(`${getVaultUrl()}/v1/auth/ldap/login/${preferences.ldap}`, {
      json: { password: preferences.password },
      headers: {
        "Content-Type": "application/json",
        "X-Vault-Namespace": getVaultNamespace(),
      },
      responseType: "json",
    })
    .json();
}

export async function callOidcAuthUrl(redirectUri: string): Promise<VaultAuthUrlResponse> {
  return got
    .post(`${getVaultUrl()}/v1/auth/oidc/oidc/auth_url`, {
      json: { redirect_uri: redirectUri },
      headers: {
        "Content-Type": "application/json",
        "X-Vault-Namespace": getVaultNamespace(),
      },
      responseType: "json",
    })
    .json();
}

export async function callLoginWthOidc(code: string, state: string): Promise<VaultLoginResponse> {
  return got
    .get(`${getVaultUrl()}/v1/auth/oidc/oidc/callback?code=${code}&state=${state}`, {
      headers: {
        "X-Vault-Namespace": getVaultNamespace(),
      },
      responseType: "json",
    })
    .json();
}

export async function listFavorites(): Promise<VaultListEntry[]> {
  return Object.keys(await LocalStorage.allItems<Values>()).map((key: string) => ({
    key: key,
    label: key,
    folder: key.endsWith("/"),
    favorite: true,
  }));
}

export async function isFavorite(path: string): Promise<boolean> {
  return Object.keys(await LocalStorage.allItems<Values>()).includes(path);
}

export async function addToFavorites(path: string, callback: () => Promise<void>) {
  await LocalStorage.setItem(path, true);
  await showToast({
    style: Toast.Style.Success,
    title: "Added to favorites",
  });
  await callback();
}

export async function removeFromFavorites(path: string, callback: () => Promise<void>) {
  await LocalStorage.removeItem(path);
  await showToast({
    style: Toast.Style.Success,
    title: "Removed from favorites",
  });
  await callback();
}
