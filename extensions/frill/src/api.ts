import { Toast, showToast } from "@raycast/api";
import fetch, { FetchError } from "node-fetch";
import {
  RequestMethod,
  BodyRequest,
  CreateAnnouncementRequest,
  ErrorResponse, GetAnnouncementsResponse, GetIdeasResponse, CreateAnnouncementResponse, SimpleSuccessResponse, UpdateAnnouncementRequest, UpdateAnnouncementResponse
} from "./types"
import { API_HEADERS, API_URL } from "./constants";

const callApi = async (endpoint: string, animatedToastMessage = "", method: RequestMethod = "GET", body?: BodyRequest) => {
  await showToast(Toast.Style.Animated, "Processing...", animatedToastMessage);

  try {
    let apiResponse;
    if (body)
        apiResponse = await fetch(API_URL + endpoint, { headers: API_HEADERS, method, body: JSON.stringify(body) });
    else
        apiResponse = await fetch(API_URL + endpoint, { headers: API_HEADERS, method, });

    if (!apiResponse.ok) {
      const errResponse = await apiResponse.json() as ErrorResponse;
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
  return (await callApi("announcements", "Fetching Announcements")) as ErrorResponse | GetAnnouncementsResponse;
}
export async function createAnnouncement(body: CreateAnnouncementRequest) {
  return (await callApi("announcements", "Creating Announcement", "POST", body)) as ErrorResponse | CreateAnnouncementResponse;
}
export async function updateAnnouncement(announcementIdx: string, body: UpdateAnnouncementRequest) {
  return (await callApi(`announcements/${announcementIdx}`, "Updating Announcement", "POST", body)) as ErrorResponse | UpdateAnnouncementResponse;
}
export async function deleteAnnouncement(announcementIdx: string) {
  return (await callApi(`announcements/${announcementIdx}`, "Deleting Announcement", "DELETE")) as ErrorResponse | SimpleSuccessResponse;
}
export async function getIdeas() {
  return (await callApi("ideas", "Fetching Ideas")) as ErrorResponse | GetIdeasResponse;
}