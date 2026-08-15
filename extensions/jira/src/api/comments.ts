import { markdownToAdf } from "marklassian";

import { request } from "./request";
import { User } from "./users";

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
  return data?.comments;
}
