import {
  List,
  Detail,
  ActionPanel,
  Action,
  Form,
  Icon,
  Color,
  showToast,
  Toast,
  confirmAlert,
  Alert,
  Keyboard,
  useNavigation,
} from "@raycast/api";
import { useExec } from "@raycast/utils";
import { useMemo, useState } from "react";
import { CONTAINER_BIN, parseImageList, Image as ContainerImage, containerExec } from "./lib/container";
import { relativeTime } from "./lib/format";

export default function Images() {
  const { isLoading, data, revalidate } = useExec(CONTAINER_BIN, ["image", "list", "--format", "json"], {
    keepPreviousData: true,
  });

  const images = useMemo(() => parseImageList(data || ""), [data]);

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search images...">
      {images.length === 0 && !isLoading ? (
        <List.EmptyView
          icon={Icon.Photo}
          title="No Images"
          description="Pull an image to get started."
          actions={
            <ActionPanel>
              <Action.Push title="Pull Image" icon={Icon.Download} target={<PullImageForm onPulled={revalidate} />} />
            </ActionPanel>
          }
        />
      ) : (
        images.map((img) => <ImageItem key={img.digest || img.reference} image={img} onAction={revalidate} />)
      )}
    </List>
  );
}

function ImageItem({ image, onAction }: { image: ContainerImage; onAction: () => void }) {
  const time = relativeTime(image.createdAt);

  return (
    <List.Item
      icon={Icon.Photo}
      title={image.reference}
      accessories={[...(image.fullSize ? [{ text: image.fullSize }] : []), ...(time ? [{ text: time }] : [])]}
      actions={
        <ActionPanel>
          <Action
            title="Pull Latest"
            icon={Icon.Download}
            shortcut={{ modifiers: ["cmd"], key: "r" }}
            onAction={async () => {
              const toast = await showToast(Toast.Style.Animated, `Pulling ${image.reference}...`);
              try {
                await containerExec(["image", "pull", image.reference]);
                toast.style = Toast.Style.Success;
                toast.title = `Pulled ${image.reference}`;
                onAction();
              } catch (e) {
                toast.style = Toast.Style.Failure;
                toast.title = `Failed to pull`;
                toast.message = String(e);
              }
            }}
          />
          <Action.Push
            title="Inspect"
            icon={Icon.MagnifyingGlass}
            shortcut={{ modifiers: ["cmd"], key: "i" }}
            target={<ImageInspect reference={image.reference} />}
          />
          <Action.CopyToClipboard title="Copy Digest" content={image.digest} shortcut={Keyboard.Shortcut.Common.Copy} />
          <Action.Push
            title="Pull New Image"
            icon={Icon.Plus}
            shortcut={{ modifiers: ["cmd", "shift"], key: "p" }}
            target={<PullImageForm onPulled={onAction} />}
          />
          <Action
            title="Delete"
            icon={{ source: Icon.Trash, tintColor: Color.Red }}
            style={Action.Style.Destructive}
            shortcut={{ modifiers: ["cmd"], key: "backspace" }}
            onAction={async () => {
              if (
                await confirmAlert({
                  title: `Delete ${image.reference}?`,
                  primaryAction: { title: "Delete", style: Alert.ActionStyle.Destructive },
                })
              ) {
                const toast = await showToast(Toast.Style.Animated, `Deleting ${image.reference}...`);
                try {
                  await containerExec(["image", "rm", image.reference]);
                  toast.style = Toast.Style.Success;
                  toast.title = `Deleted ${image.reference}`;
                  onAction();
                } catch (e) {
                  toast.style = Toast.Style.Failure;
                  toast.title = `Failed to delete`;
                  toast.message = String(e);
                }
              }
            }}
          />
        </ActionPanel>
      }
    />
  );
}

function PullImageForm({ onPulled }: { onPulled: () => void }) {
  const [isLoading, setIsLoading] = useState(false);
  const { pop } = useNavigation();

  return (
    <Form
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Pull Image"
            onSubmit={async (values: { image: string }) => {
              const ref = values.image.trim();
              if (!ref) {
                await showToast(Toast.Style.Failure, "Image reference is required");
                return;
              }
              setIsLoading(true);
              const toast = await showToast(Toast.Style.Animated, `Pulling ${ref}...`);
              try {
                await containerExec(["image", "pull", ref]);
                toast.style = Toast.Style.Success;
                toast.title = `Pulled ${ref}`;
                onPulled();
                pop();
              } catch (e) {
                toast.style = Toast.Style.Failure;
                toast.title = `Failed to pull`;
                toast.message = String(e);
              } finally {
                setIsLoading(false);
              }
            }}
          />
        </ActionPanel>
      }
    >
      <Form.TextField id="image" title="Image" placeholder="e.g. postgres:15, nginx:latest" autoFocus />
    </Form>
  );
}

function ImageInspect({ reference }: { reference: string }) {
  const { isLoading, data } = useExec(CONTAINER_BIN, ["image", "inspect", reference]);

  let formatted = "";
  if (data) {
    try {
      formatted = "```json\n" + JSON.stringify(JSON.parse(data), null, 2) + "\n```";
    } catch {
      formatted = "```\n" + data + "\n```";
    }
  }

  return (
    <Detail
      isLoading={isLoading}
      navigationTitle={`${reference} — Inspect`}
      markdown={formatted}
      actions={
        <ActionPanel>
          <Action.CopyToClipboard title="Copy JSON" content={data || ""} />
        </ActionPanel>
      }
    />
  );
}
