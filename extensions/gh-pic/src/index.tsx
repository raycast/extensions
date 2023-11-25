import { List, ActionPanel, Action, getPreferenceValues, Icon, showToast, Toast, Clipboard } from "@raycast/api";
import { useState, useEffect } from "react";
import { Octokit } from "@octokit/core";
import { RequestError } from "@octokit/request-error";
import * as fs from "fs";
import dayjs from "dayjs";
import { execaSync } from "execa";

const TEMP_PIC_PATH = "/tmp/GHPicTemp.jpg";
const REPO_URL = "https://github.com/xiangsanliu/gh-pic";

interface Preferences {
  githubToken: string;
  owner: string;
  repo: string;
  path: string;
  email: string;
  pngpastePath: string;
  committer: string;
}

const preferences = getPreferenceValues<Preferences>();

// Github Auth
const octokit = new Octokit({ auth: preferences.githubToken });

type resultDto = {
  errorCode: number;
  errorMsg: string;
  picUrl: string;
  helpUrl: string;
  icon: Icon;
};

/**
 * Upload pic to github.
 * @returns res
 */
async function uploadPic() {
  const res = {
    errorCode: 0,
    errorMsg: "success",
    picUrl: "",
    icon: Icon.CircleProgress100,
    helpUrl: REPO_URL,
  };
  try {
    const text = await Clipboard.readText();
    if (!text) {
      // Paste pic from clipboard to Temp folder.
      execaSync(preferences.pngpastePath, [TEMP_PIC_PATH]);

      const pic = fs.readFileSync(TEMP_PIC_PATH);
      const content = Buffer.from(pic).toString("base64");
      const path = `${preferences.path}${dayjs().format("YYYY-MM-DDTHH:mm:ss")}.jpg`;

      // Upload pic to github.
      await octokit.request("PUT /repos/{owner}/{repo}/contents/{path}", {
        owner: preferences.owner,
        repo: preferences.repo,
        path: path,
        message: "Upload by GHPic.",
        committer: {
          name: preferences.committer,
          email: preferences.email,
        },
        content: content,
      });
      res.picUrl = `https://cdn.jsdelivr.net/gh/${preferences.owner}/${preferences.repo}/${path}`;
    } else {
      res.errorCode = 3;
      res.errorMsg = "Check whether the clipboard contains a picture, press Enter for help.";
      res.helpUrl = `${REPO_URL}#usage`;
    }
  } catch (error) {
    res.icon = Icon.Multiply;
    if (error instanceof RequestError) {
      res.errorCode = 1;
      res.errorMsg = "Upload image to Github failed, press Enter for help.";
    } else {
      res.errorCode = 2;
      res.errorMsg = "Paste image from clipboard failed, press Enter for help.";
    }
    console.log(error);
  }
  return res;
}

export default function Command() {
  const [res, setRes] = useState<resultDto>({
    errorCode: 4,
    errorMsg: "Uploading...",
    picUrl: "",
    icon: Icon.CircleProgress50,
    helpUrl: REPO_URL,
  });
  const [loaded, setLoaded] = useState(false);
  if (preferences.path.length > 0 && !preferences.path.endsWith("/")) {
    preferences.path += "/";
  } else if (preferences.path.startsWith("/")) {
    preferences.path = preferences.path.substring(1);
  }
  if (preferences.committer == "") {
    preferences.committer = preferences.owner;
  }
  useEffect(() => {
    uploadPic().then((res) => {
      if (res.errorCode == 0) {
        showToast({
          style: Toast.Style.Success,
          title: "Uploaded successfully.",
        });
      } else {
        showToast({
          style: Toast.Style.Failure,
          title: "Upload failed.",
        });
      }
      setRes(res);
      setLoaded(true);
    });
  }, []);

  return (
    <List isLoading={!loaded}>
      {res.errorCode == 0 ? (
        <>
          <List.Item
            icon={Icon.CopyClipboard}
            title={"Copy as markdown"}
            actions={
              <ActionPanel>
                <Action.CopyToClipboard content={`![](${res.picUrl})`} />
              </ActionPanel>
            }
          />
          <List.Item
            icon={Icon.CopyClipboard}
            title={"Copy URL"}
            actions={
              <ActionPanel>
                <Action.CopyToClipboard content={res.picUrl} />
              </ActionPanel>
            }
          />
        </>
      ) : (
        <>
          <List.Item
            title={res.errorMsg}
            icon={res.icon}
            actions={
              <ActionPanel>
                <Action.OpenInBrowser url={res.helpUrl} />
              </ActionPanel>
            }
          />
        </>
      )}
    </List>
  );
}
