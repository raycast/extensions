import { LinkSchema } from "dub/models/components/linkschema";
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

  return await dub.links.create({
    url: originalUrl,
    key,
    domain,
    tagIds,
    comments,
  });
};

export const getAllShortLinks = async (query: string = ""): Promise<{ links: LinkSchema[]; hasMoreLinks: boolean }> => {
  const dub = getDubClient();

  const links = await dub.links.list(query ? {search: query} : {})
  
  const hasMoreLinks = !(links?.length < 100);

  return {links, hasMoreLinks}
};

export const deleteShortLink = async (linkId: string) => {
  const dub = getDubClient();

  return await dub.links.delete(linkId);
};

/**
 * todo: Add commands and api(s) to create/manage tags in the workspace.
 */
export const getAllTags = async () => {
  const dub = getDubClient();

  return await dub.tags.list();
};

export const getAllDomains = async () => {
  const dub = getDubClient();

  const { result } = await dub.domains.list();

  return result;
};
