import { getLinks } from "@/utils/links";

export default async function getDocumentationLinks() {
  const resLinks = await getLinks();
  return resLinks;
}
