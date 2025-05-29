import { createContext, JSX } from 'react';
import * as sdk from 'node-appwrite';
import { Project } from './projects';

const client = new sdk.Client();
const databases = new sdk.Databases(client)
const storage = new sdk.Storage(client)
export const SDKContext = createContext<{databases: sdk.Databases, storage: sdk.Storage}>({ databases, storage });
export function SDKProvider({ project, children }: { project: Project; children: JSX.Element }) {
    client
        .setEndpoint(project.endpoint)
        .setProject(project.id)
        .setKey(project.key);
        
    return <SDKContext.Provider value={{databases, storage}}>
        {children}
    </SDKContext.Provider>
}

export * as sdk from 'node-appwrite';