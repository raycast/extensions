import { List, ActionPanel, Action, showToast, Toast, getPreferenceValues } from "@raycast/api";
import { useEffect, useState } from "react";
import { execaSync } from "execa";
import fs from "fs";
import dayjs from "dayjs";
import OSS from "ali-oss";
import iconv from "iconv-lite";
import { URL } from "url";

interface Preferences {
  accessKeyId: string;
  accessKeySecret: string;
  bucket: string;
  region: string;
  pngpasteFullPath: string;
  domain: string;
}

type Pic = {
  url: string;
  picName: string;
};

type ActionItem = {
  item: {
    content: string;
  };
};

const preferences = getPreferenceValues<Preferences>();

export default function main() {
  const [pic, setPic] = useState<Pic>({ url: "", picName: "" });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const picName = getPicDataAndPicName();
    if (picName) {
      picUpload(picName).then((pic) => {
        if (pic && pic.url) {
          if (preferences.domain) {
            try {
              const url = new URL(pic.url);
              pic.url = pic.url.replace(url.origin, preferences.domain);
            } catch (err: unknown) {
              handleShowToast(err, "Convert URL Failed.");
            }
          }
          setPic(pic);
        }
      });
    }
  }, []);

  function getPicDataAndPicName() {
      if (fs.existsSync(preferences.pngpasteFullPath)) {
        let picName = "";
        try {
          const { failed } = execaSync(preferences.pngpasteFullPath, ["/tmp/upload-to-oss"]);
          if (!failed) {
            const { stdout: name } = execaSync("pbpaste", [], { encoding: null });
            picName = iconv.decode(Buffer.from(name), "cp936") || `${new Date().getTime()}.png`;
          }
        } catch {
          handleShowToast("Copy Image Failed.");
        }
        return picName;
      } else {
        handleShowToast("The Path Of Pngpaste Is Wrong.");
      }
    }
  }

  async function picUpload(picName: string) {
    const store = new OSS({
      accessKeyId: preferences.accessKeyId,
      accessKeySecret: preferences.accessKeySecret,
      bucket: preferences.bucket,
      region: preferences.region,
    });
    try {
      setLoading(true);
      const { url } = await store.put(`${dayjs().format("YYYY-MM")}/${picName}`, "/tmp/upload-to-oss");
      if (url) {
        setLoading(false);
        return { url, picName };
      }
    } catch {
      setLoading(false);
      handleShowToast("Upload Image Failed.");
    }
    return null;
  }

  function handleShowToast(title: string) {
    showToast({
      style: Toast.Style.Failure,
      title: title,
      message: title,
    });
  }

  return (
    <List isLoading={loading}>
      {pic.url ? (
        <>
          <List.Item
            title="MD"
            icon="markdown.png"
            actions={<Actions item={{ content: `![${pic.picName}](${pic.url})` }} />}
          ></List.Item>
          <List.Item title="URL" icon="url.png" actions={<Actions item={{ content: pic.url }} />}></List.Item>
        </>
      ) : null}
    </List>
  );
}

function Actions({ item }: ActionItem) {
  return (
    <ActionPanel>
      <Action.CopyToClipboard content={item.content} />
    </ActionPanel>
  );
}
