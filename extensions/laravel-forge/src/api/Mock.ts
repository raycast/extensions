import { createFakeServer, createFakeSite } from "../lib/faker";
import { IServer, ISite } from "../types";

export const MockServer = {
  getAll: async (): Promise<IServer[]> => createFakeServer(25),
};

export const MockSite = {
  getAll: async (serverId: IServer["id"]): Promise<ISite[]> =>
    createFakeSite(serverId, Math.floor(Math.random() * 3) + 1),
  get: async (site: ISite): Promise<ISite> => site,
};
