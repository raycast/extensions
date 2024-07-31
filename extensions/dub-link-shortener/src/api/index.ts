import { getDubClient } from "./oauth";

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
  const dub = getDubClient();

  return dub.links.create({
    url: originalUrl,
    key,
    domain,
    tagIds,
    comments,
  });
};

export const getAllShortLinks = async () => {
  const dub = getDubClient();

  return dub.links.list();
};

export const deleteShortLink = async (linkId: string) => {
  const dub = getDubClient();

  return dub.links.delete(linkId);
};

/**
 * todo: Add commands and api(s) to create/manage tags in the workspace.
 */
export const getAllTags = async () => {
  const dub = getDubClient();

  return dub.tags.list();
};

export const getAllDomains = async () => {
  const dub = getDubClient();

  return dub.domains.list();
};
