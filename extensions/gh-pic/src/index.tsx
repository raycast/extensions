import { List, ActionPanel, Action, getPreferenceValues, Icon, showToast, Toast, Clipboard } from "@raycast/api";
import { useState, useEffect } from "react";
import { Octokit } from "@octokit/core";
import { RequestError } from "@octokit/request-error";
import * as fs from "fs";
import dayjs from "dayjs";
import * as fileType from "file-type";

const REPO_URL = "https://github.com/xiangsanliu/gh-pic";

interface Preferences {
  githubToken: string;
  owner: string;
  repo: string;
  path: string;
  email: string;
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
    const pic = await getPicFromClipboard();
    if (pic) {
      const content = Buffer.from(pic.buffer).toString("base64");
      const path = `${preferences.path}${dayjs().format("YYYY-MM-DDTHH:mm:ss")}.${pic.ext}`;

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
  }
  return res;
}

async function getPicFromClipboard() {
  const data = await Clipboard.read();
  const file = data.file;
  if (file) {
    const filepath = decodeURIComponent(file.substring(7));
    const buffer = fs.readFileSync(filepath);
    const type = await fileType.fileTypeFromBuffer(buffer);

    const { ext, mime } = type ? type : { ext: "", mime: "" };
    if (mime.startsWith("image")) {
      return {
        ext: ext,
        buffer: buffer,
      };
    }
  }
  return null;
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
