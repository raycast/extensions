import { Toast, showToast } from "@raycast/api";
import fetch, { FetchError } from "node-fetch";
import { API_HEADERS, API_URL, DEFAULT_PAGINATION_LIMIT } from "./constants";
import {
  CreateStatusRequest,
  DeleteStatusResponse,
  GetStatusesResponse,
  UpdateStatusRequest,
  UpdateStatusResponse,
} from "../types/statuses";
import {
  BodyRequest,
  SingleErrorResponse,
  MultiErrorResponse,
  RequestMethod,
  SimpleSuccessResponse,
  ErrorResponse,
} from "../types";
import {
  CreateAnnouncementRequest,
  CreateAnnouncementResponse,
  GetAnnouncementsResponse,
  UpdateAnnouncementRequest,
  UpdateAnnouncementResponse,
} from "../types/announcements";
import {
  CreateIdeaRequest,
  CreateIdeaResponse,
  DeleteIdeaResponse,
  GetIdeasResponse,
  UpdateIdeaRequest,
  UpdateIdeaResponse,
} from "../types/ideas";
import {
  CreateTopicRequest,
  CreateTopicResponse,
  DeleteTopicResponse,
  GetTopicsResponse,
  UpdateTopicRequest,
  UpdateTopicResponse,
} from "../types/topics";
import { GetFollowersResponse } from "../types/followers";
import { GetAdminsResponse } from "../types/admin";
import { GetAnnouncementCategoriesResponse } from "../types/announcement-categories";

const callApi = async (
  endpoint: string,
  animatedToastMessage = "",
  method: RequestMethod = "GET",
  body?: BodyRequest,
) => {
  await showToast(Toast.Style.Animated, "Processing...", animatedToastMessage);

  try {
    let apiResponse;
    if (body)
      apiResponse = await fetch(API_URL + endpoint, { headers: API_HEADERS, method, body: JSON.stringify(body) });
    else apiResponse = await fetch(API_URL + endpoint, { headers: API_HEADERS, method });

    if (!apiResponse.ok) {
      const errResponse = (await apiResponse.json()) as ErrorResponse;
      const { message } = errResponse;
      await showToast({ title: `${apiResponse.status} Error`, message, style: Toast.Style.Failure });
      return errResponse;
    } else {
      const response = await apiResponse.json();
      return response;
    }
  } catch (error) {
    let message = "Something went wrong";
    if (error instanceof FetchError) {
      message = error.message;
    }
    await showToast({ title: "ERROR", message, style: Toast.Style.Failure });
    return { error: true, message };
  }
};

export async function getAnnouncements() {
  return (await callApi("announcements", "Fetching Announcements")) as SingleErrorResponse | GetAnnouncementsResponse;
}
export async function createAnnouncement(body: CreateAnnouncementRequest) {
  return (await callApi("announcements", "Creating Announcement", "POST", body)) as
    | ErrorResponse
    | CreateAnnouncementResponse;
}
export async function updateAnnouncement(announcementIdx: string, body: UpdateAnnouncementRequest) {
  return (await callApi(`announcements/${announcementIdx}`, "Updating Announcement", "POST", body)) as
    | ErrorResponse
    | UpdateAnnouncementResponse;
}
export async function deleteAnnouncement(announcementIdx: string) {
  return (await callApi(`announcements/${announcementIdx}`, "Deleting Announcement", "DELETE")) as
    | SingleErrorResponse
    | SimpleSuccessResponse;
}

export async function getIdeas() {
  return (await callApi(`ideas?limit=${DEFAULT_PAGINATION_LIMIT}`, "Fetching Ideas")) as
    | SingleErrorResponse
    | GetIdeasResponse;
}
export async function createIdea(body: CreateIdeaRequest) {
  return (await callApi("ideas", "Creating Idea", "POST", body)) as SingleErrorResponse | CreateIdeaResponse;
}
export async function updateIdea(ideaIdx: string, body: UpdateIdeaRequest) {
  return (await callApi(`ideas/${ideaIdx}`, "Updating Idea", "POST", body)) as SingleErrorResponse | UpdateIdeaResponse;
}
export async function deleteIdea(ideaIdx: string) {
  return (await callApi(`ideas/${ideaIdx}`, "Deleting Idea", "DELETE")) as SingleErrorResponse | DeleteIdeaResponse;
}

export async function getTopics() {
  return (await callApi(`topics?limit=${DEFAULT_PAGINATION_LIMIT}`, "Fetching Topics")) as
    | SingleErrorResponse
    | GetTopicsResponse;
}
export async function deleteTopic(topicIdx: string) {
  return (await callApi(`topics/${topicIdx}`, "Deleting Topic", "DELETE")) as SingleErrorResponse | DeleteTopicResponse;
}
export async function createTopic(body: CreateTopicRequest) {
  return (await callApi("topics", "Creating Topic", "POST", body)) as ErrorResponse | CreateTopicResponse;
}
export async function updateTopic(topicIdx: string, body: UpdateTopicRequest) {
  return (await callApi(`topics/${topicIdx}`, "Updating Topic", "POST", body)) as ErrorResponse | UpdateTopicResponse;
}

export async function getFollowers() {
  return (await callApi(`followers?limit=${DEFAULT_PAGINATION_LIMIT}`, "Fetching Followers")) as
    | SingleErrorResponse
    | GetFollowersResponse;
}
export async function deleteFollower(followerIdx: string) {
  return (await callApi(`followers/${followerIdx}`, "Deleting Follower", "DELETE")) as
    | SingleErrorResponse
    | DeleteTopicResponse;
}

export async function getAdmins() {
  return (await callApi(`admins?limit=${DEFAULT_PAGINATION_LIMIT}`, "Fetching Admins")) as
    | SingleErrorResponse
    | GetAdminsResponse;
}
export async function getAnnouncementCategories() {
  return (await callApi("announcement-categories", "Fetching Announcement Categories")) as
    | SingleErrorResponse
    | GetAnnouncementCategoriesResponse;
}

export async function getStatuses() {
  return (await callApi(`statuses?limit=${DEFAULT_PAGINATION_LIMIT}`, "Fetching Statuses")) as
    | SingleErrorResponse
    | GetStatusesResponse;
}
export async function deleteStatus(statusIdx: string) {
  return (await callApi(`statuses/${statusIdx}`, "Deleting Status", "DELETE")) as
    | SingleErrorResponse
    | DeleteStatusResponse;
}
export async function createStatus(body: CreateStatusRequest) {
  return (await callApi("statuses", "Creating Status", "POST", body)) as SingleErrorResponse | CreateStatusRequest;
}
export async function updateStatus(statusIdx: string, body: UpdateStatusRequest) {
  return (await callApi(`statuses/${statusIdx}`, "Updating Status", "POST", body)) as
    | MultiErrorResponse
    | UpdateStatusResponse;
}
