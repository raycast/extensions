import { Dub } from "dub";
import { workspaceApiKey } from "@utils/env";

const dub = new Dub({
  token: workspaceApiKey,
});

export const createShortLink = async ({
  originalUrl,
  key,
  domain,
  tagIds,
  comments,
}: {
  originalUrl: string;
  key?: string;
  domain?: string;
  tagIds?: string[];
  comments?: string;
}) => {
  return dub.links.create({
    url: originalUrl,
    key,
    domain,
    tagIds,
    comments,
  });
};

export const getAllShortLinks = async () => {
  return dub.links.list();
};

export const deleteShortLink = async (linkId: string) => {
  return dub.links.delete(linkId);
};

/**
 * todo: Add commands and api(s) to create/manage tags in the workspace.
 */
export const getAllTags = async () => {
  return dub.tags.list();
};

export const getAllDomains = async () => {
  return dub.domains.list();
};
