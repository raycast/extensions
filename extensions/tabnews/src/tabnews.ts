import { useFetch } from "@raycast/utils";
import { PostResponse, Strategy } from "./types";

const baseUrl = "https://www.tabnews.com.br";
const apiUrl = `${baseUrl}/api/v1`;
export function fetchContents({ page = 1, limit = 10, strategy = Strategy.Relevant }) {
  return useFetch<Array<PostResponse>>(`${apiUrl}/contents?$page=${page}&per_page=${limit}&strategy=${strategy}`);
}
export function getContetUrlFromPostResponse(postResponse: PostResponse) {
  return `${baseUrl}/${postResponse.owner_username}/${postResponse.slug}`;
}
