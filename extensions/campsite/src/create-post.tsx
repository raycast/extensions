import {
  Form,
  ActionPanel,
  Action,
  showToast,
  Toast,
  Detail,
  showHUD,
  open,
  Clipboard,
  popToRoot,
  getPreferenceValues,
  openExtensionPreferences,
} from "@raycast/api";
import { useEffect, useRef, useState } from "react";
import * as oauth from "./utils/oauth";
import { ORG_SLUG_MISSING_MESSAGE, createPost, getProjects } from "./utils/api";
import { CreatePostRequest, Project } from "./utils/types";

export default function Command() {
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [projects, setProjects] = useState<Project[]>([]);
  const { orgSlug } = getPreferenceValues<ExtensionPreferences>();

  // prevent double authorization in strict mode
  const didAuthorize = useRef(false);

  useEffect(() => {
    (async () => {
      if (didAuthorize.current) return;
      didAuthorize.current = true;
      try {
        await oauth.authorize();
        setIsLoading(false);
        setIsAuthorized(true);
      } catch (error) {
        setIsLoading(false);
        showToast({ style: Toast.Style.Failure, title: String(error) });
      }
    })();
  }, []);

  useEffect(() => {
    if (isAuthorized && orgSlug) {
      getProjects().then(setProjects);
    }
  }, [isAuthorized, orgSlug]);

  async function handleSubmit(values: CreatePostRequest) {
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: "Creating post",
    });

    createPost(values).then((res) => {
      toast.style = Toast.Style.Success;
      toast.title = "Post created";
      toast.primaryAction = {
        title: "Open Post",
        onAction: () => {
          open(res.url);
        },
      };
      toast.secondaryAction = {
        title: "Copy Post URL",
        onAction: async () => {
          await Clipboard.copy(res.url);
          showHUD("Copied post URL to clipboard");
        },
      };

      popToRoot();
    });
  }

  if (isLoading) {
    return <Detail isLoading={isLoading} />;
  }

  if (!orgSlug) {
    return (
      <Detail
        markdown={ORG_SLUG_MISSING_MESSAGE}
        actions={
          <ActionPanel>
            <Action title="Open Extension Preferences" onAction={openExtensionPreferences} />
          </ActionPanel>
        }
      />
    );
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm onSubmit={handleSubmit} title="Create Post" />
        </ActionPanel>
      }
    >
      <Form.TextField id="title" title="Title" placeholder="Post title" />
      <Form.TextArea id="content" title="Content" placeholder="Post content" />
      <Form.Dropdown id="project_id" title="Space" defaultValue={projects.find((p) => p.general)?.id}>
        {projects.map((project) => (
          <Form.Dropdown.Item key={project.id} value={project.id} title={project.name} />
        ))}
      </Form.Dropdown>
    </Form>
  );
}
