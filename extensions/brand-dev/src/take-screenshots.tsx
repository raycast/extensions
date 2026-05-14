import { Action, ActionPanel, Form, Icon, List, showToast, Toast, useNavigation } from "@raycast/api";
import { FormValidation, getFavicon, useForm, useLocalStorage } from "@raycast/utils";
import { API_HEADERS, API_URL, parseBrandDevResponse } from "./common";
import { Screenshot } from "./types/screenshot";

type ScreenshotInStorage = Screenshot & {
  page: string;
  prioritize: string;
  created_on: string;
  updated_on: string;
};
export default function TakeScreenshots() {
  const {
    isLoading,
    value: screenshots = [],
    setValue: setScreenshots,
  } = useLocalStorage<ScreenshotInStorage[]>("screenshots", []);
  async function updateScreenshots(screenshot: ScreenshotInStorage) {
    const newScreenshots = [...screenshots];
    newScreenshots.push(screenshot);
    await setScreenshots(newScreenshots);
  }
  async function removeScreenshot(oldScreenshot: ScreenshotInStorage) {
    const newScreenshots = screenshots;
    const index = newScreenshots.findIndex((screenshot) => screenshot.domain === oldScreenshot.domain);
    if (index !== -1) newScreenshots.splice(index, 1);
    await setScreenshots(newScreenshots);
  }

  return (
    <List isLoading={isLoading} isShowingDetail>
      <List.EmptyView
        title="No Results"
        description="Take a screenshot to get started"
        actions={
          <ActionPanel>
            <Action.Push
              icon={Icon.Camera}
              title="Take Screenshot"
              target={<TakeScreenshot onScreenshot={updateScreenshots} />}
            />
          </ActionPanel>
        }
      />
      {screenshots.map((screenshot) => (
        <List.Item
          key={screenshot.domain}
          icon={getFavicon(screenshot.domain, { fallback: Icon.Image })}
          title={screenshot.domain}
          accessories={[{ date: new Date(screenshot.created_on) }]}
          detail={
            <List.Item.Detail
              markdown={`![](${screenshot.screenshot})`}
              metadata={
                <List.Item.Detail.Metadata>
                  <List.Item.Detail.Metadata.TagList title="Type">
                    <List.Item.Detail.Metadata.TagList.Item text={screenshot.screenshotType} />
                  </List.Item.Detail.Metadata.TagList>
                  <List.Item.Detail.Metadata.Label title="Page" text={screenshot.page || "Default (Landing)"} />

                  <List.Item.Detail.Metadata.TagList title="Prioritize">
                    <List.Item.Detail.Metadata.TagList.Item text={screenshot.prioritize} />
                  </List.Item.Detail.Metadata.TagList>
                </List.Item.Detail.Metadata>
              }
            />
          }
          actions={
            <ActionPanel>
              <Action.Push
                icon={Icon.Camera}
                title="Take Screenshot"
                target={<TakeScreenshot onScreenshot={updateScreenshots} />}
              />
              <Action
                icon={Icon.Trash}
                style={Action.Style.Destructive}
                title="Remove Screenshot"
                onAction={() => removeScreenshot(screenshot)}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}

function TakeScreenshot({ onScreenshot }: { onScreenshot: (screenshot: ScreenshotInStorage) => void }) {
  const { pop } = useNavigation();
  type FormValues = {
    domain: string;
    fullScreenshot: boolean;
    page: string;
    prioritize: string;
  };
  const { handleSubmit, itemProps } = useForm<FormValues>({
    async onSubmit(values) {
      const toast = await showToast(Toast.Style.Animated, "Screenshotting", values.domain);
      const params = new URLSearchParams({
        domain: values.domain,
        fullScreenshot: values.fullScreenshot ? "true" : "false",
        prioritize: values.prioritize === "quality" ? "quality" : "speed",
      });
      if (values.page) params.append("page", values.page);
      try {
        const response = await fetch(API_URL + `screenshot?${params}`, {
          headers: API_HEADERS,
        });
        const result = await parseBrandDevResponse<Screenshot>(response);
        const newScreenshot: ScreenshotInStorage = {
          ...result,
          prioritize: values.prioritize,
          page: values.page,
          created_on: new Date().toISOString(),
          updated_on: new Date().toISOString(),
        };
        toast.style = Toast.Style.Success;
        toast.title = "Screenshotted";
        onScreenshot(newScreenshot);
        pop();
      } catch (error) {
        toast.style = Toast.Style.Failure;
        toast.title = "Failed";
        toast.message = `${error}`;
      }
    },
    validation: {
      domain: FormValidation.Required,
    },
  });
  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm icon={Icon.Camera} title="Take Screenshot" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField title="Domain" placeholder="brand.dev" {...itemProps.domain} />
      <Form.Separator />
      <Form.Checkbox
        label="Full Screenshot"
        {...itemProps.fullScreenshot}
        info="If 'true', takes a full page screenshot capturing all content. If 'false' or not provided, takes a viewport screenshot (standard browser view)."
      />
      <Form.Dropdown title="Page" {...itemProps.page}>
        <Form.Dropdown.Item title="Default (Landing)" value="" />
        {["login", "signup", "blog", "careers", "pricing", "terms", "privacy", "contact"].map((p) => (
          <Form.Dropdown.Item key={p} title={p.charAt(0).toUpperCase() + p.slice(1)} value={p} />
        ))}
      </Form.Dropdown>
      <Form.Dropdown title="Prioritize" {...itemProps.prioritize}>
        <Form.Dropdown.Item title="Quality" value="quality" />
        <Form.Dropdown.Item title="Speed" value="speed" />
      </Form.Dropdown>
    </Form>
  );
}
