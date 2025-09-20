import { createContext, JSX } from "react";
import * as sdk from "node-appwrite";
import { Project } from "./projects";

const client = new sdk.Client();
const databases = new sdk.Databases(client);
const storage = new sdk.Storage(client);
const users = new sdk.Users(client);
const sites = new sdk.Sites(client);

export const SDKContext = createContext<{
  databases: sdk.Databases;
  storage: sdk.Storage;
  users: sdk.Users;
  sites: sdk.Sites;
}>({ databases, storage, users, sites });

export function SDKProvider({ project, children }: { project: Project; children: JSX.Element }) {
  client.setEndpoint(project.endpoint).setProject(project.id).setKey(project.key);

  return <SDKContext.Provider value={{ databases, storage, users, sites }}>{children}</SDKContext.Provider>;
}

export * as sdk from "node-appwrite";
