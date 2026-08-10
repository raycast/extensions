import { showToast, Toast } from "@raycast/api";
import { Octokit } from "@octokit/rest";
import fetch from "node-fetch";

export const onRequestError = async (e: Error) => {
  await showToast({
    style: Toast.Style.Failure,
    title: "Request failed 🔴",
    message: e.message || "Please try again later 🙏",
  });
};

export const octokit = new Octokit({
  request: {
    fetch: fetch,
  },
});
