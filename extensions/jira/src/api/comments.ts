import { request } from "./request";
import { User } from "./users";
import markdownToAdf from "md-to-adf";
import { getAuthenticatedUri, getBaseUrl } from "../api/request";
import { replaceAsync } from "../helpers/string";

type CreateCommentResponse = {
  id: string;
  key: string;
};
export type Comment = {
  id: string;
  created: string;
  author: User;
  renderedBody: string;
};

export type Comments = {
  id: string;
  comments: Comment[];
};

export async function createComment(issueIdOrKey: string, body: string) {
  return request<CreateCommentResponse>(`/issue/${issueIdOrKey}/comment`, {
    method: "POST",
    body: JSON.stringify({ body: markdownToAdf(body) }),
  });
}

export async function updateComment(issueIdOrKey: string, commentId: string, body: string) {
  return request(`/issue/${issueIdOrKey}/comment/${commentId}`, {
    method: "PUT",
    body: JSON.stringify({ body: markdownToAdf(body) }),
  });
}

export async function deleteComment(issueIdOrKey: string, commentId: string) {
  return request(`/issue/${issueIdOrKey}/comment/${commentId}`, {
    method: "DELETE",
  });
}

export async function getComments(issueIdOrKey: string) {
  const params = { expand: "renderedBody", orderBy: "-created" };
  const data = await request<Comments>(`/issue/${issueIdOrKey}/comment`, { params });

  // const resolvedComments = await Promise.all<Comments>(
  //   data?.comments.map(async (comment) => {
  //     if (!comment) {
  //       return null;
  //     }

  //     const baseUrl = getBaseUrl();
  //     const description = comment.renderedBody;
  //     // Resolve all the image URLs to data URIs in the cached promise for better performance
  //     // Jira images use partial URLs, so we need to prepend the base URL
  //     const resolvedDescription = await replaceAsync(description, /src="(.*?)"/g, async (_, uri) => {
  //       const dataUri = await getAuthenticatedUri(`${baseUrl}${uri}`, "image/jpeg");
  //       return `src="${dataUri}"`;
  //     });
  //     comment.renderedBody = resolvedDescription;

  //     return comment;
  //   })
  // );

  // return resolvedComments;

  return data?.comments;
}