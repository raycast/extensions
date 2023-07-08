import { requestSelectFiles, requestTorrentStatus, requestUnrestrict } from "../api";
import useToken from "./useToken";
import { LinkType } from "../schema";

export const useUnrestrict = () => {
  const token = useToken();

  const unRestrictLink = (link: string, type: LinkType) => {
    return requestUnrestrict(link, token, type);
  };
  const getTorrentStatus = (id: string) => {
    return requestTorrentStatus(id, token);
  };

  const selectTorrentFiles = (id: string, files?: string) => {
    return requestSelectFiles(id, token, files);
  };

  const unRestrictLinks = async (links: string[], type: LinkType) => {
    const results = await Promise.allSettled(links.map((link) => unRestrictLink(link, type)));
    return results;
  };

  return {
    unRestrictLink,
    unRestrictLinks,
    getTorrentStatus,
    selectTorrentFiles,
  };
};

export default useUnrestrict;
