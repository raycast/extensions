import {
  Form,
  ActionPanel,
  Action,
  showToast,
  Toast,
  popToRoot,
  Clipboard,
  Alert,
  useNavigation,
  confirmAlert,
} from "@raycast/api";
import { v4 as uuidv4 } from "uuid";
import { addClip, getClips } from "./utils/storage";
import { Clip } from "./types";
import { useState, useEffect } from "react";
import { generateClipTitleAndTags } from "./utils/deepseeker";
import { getLocalizedStrings } from "./utils/i18n";
import ClipGallery from "./clip-gallery";

export default function AddClip() {
  const [urlFromClipboard, setUrlFromClipboard] = useState("");
  const [title, setTitle] = useState("");
  const [tags, setTags] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { push } = useNavigation();

  // 获取本地化字符串
  const strings = getLocalizedStrings();

  useEffect(() => {
    async function getClipboardContent() {
      const text = await Clipboard.readText();
      if (text && isValidUrl(text)) {
        setUrlFromClipboard(text);
        await generateTitleAndTagsForUrl(text);
      }
    }
    getClipboardContent();
  }, []);

  function isValidUrl(string: string) {
    try {
      new URL(string);
      return true;
    } catch (_) {
      return false;
    }
  }

  async function generateTitleAndTagsForUrl(url: string) {
    try {
      setIsLoading(true);
      const { title: generatedTitle, tags: generatedTags } = await generateClipTitleAndTags(url);
      setTitle(generatedTitle);
      setTags(generatedTags.join(", "));
    } catch (error) {
      showToast(Toast.Style.Failure, strings.generateTitleAndTagsFailed);
    } finally {
      setIsLoading(false);
    }
  }

  async function handleSubmit(values: { title: string; url: string; tags: string }) {
    try {
      setIsLoading(true);
      const clips = await getClips();
      const existingClip = clips.find((clip) => clip.url === values.url);

      if (existingClip) {
        const options: Alert.Options = {
          title: strings.clipAlreadyExists,
          message: strings.clipAlreadyExistsMessage,
          primaryAction: {
            title: strings.show,
            onAction: () => push(<ClipGallery initialFilterUrl={values.url} />),
          },
          dismissAction: {
            title: strings.cancel,
          },
        };
        await confirmAlert(options);
      } else {
        await addNewClip(values);
      }
    } catch (error) {
      console.log("error: ", error);
      showToast(Toast.Style.Failure, strings.failedToAddClip);
    } finally {
      setIsLoading(false);
    }
  }

  async function addNewClip(values: { title: string; url: string; tags: string }) {
    const newClip: Clip = {
      id: uuidv4(),
      title: values.title,
      url: values.url,
      tags: values.tags.split(",").map((tag) => tag.trim()),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      coverImage: `https://api.microlink.io/?url=${encodeURIComponent(values.url)}&screenshot=true&meta=false&embed=screenshot.url`,
    };
    await addClip(newClip);
    showToast(Toast.Style.Success, strings.clipAdded);
    popToRoot();
  }

  return (
    <Form
      navigationTitle={strings.addClip}
      actions={
        <ActionPanel>
          <Action.SubmitForm onSubmit={handleSubmit} />
        </ActionPanel>
      }
      isLoading={isLoading}
    >
      <Form.TextField id="title" title={strings.title} value={title} onChange={setTitle} />
      <Form.TextField
        id="url"
        title={strings.url}
        value={urlFromClipboard}
        onChange={(newUrl) => {
          setUrlFromClipboard(newUrl);
        }}
      />
      <Form.TextField
        id="tags"
        title={strings.tags}
        value={tags}
        onChange={setTags}
        placeholder={strings.separateTagsWithComma}
      />
    </Form>
  );
}
