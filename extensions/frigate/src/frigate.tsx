import { Action, ActionPanel, Form, Grid, Icon, LocalStorage, open, showHUD, useNavigation } from "@raycast/api";
import { useEffect, useState } from "react";

interface Video {
  static: string;
  title: string;
  stream: string;
}

export default function Command() {
  const [videos, setVideos] = useState<Video[]>([]);

  useEffect(() => {
    (async () => {
      const storedVideos = await LocalStorage.getItem<string>("videos");
      if (storedVideos) {
        try {
          setVideos(JSON.parse(storedVideos));
        } catch (error) {
          console.error("Failed to parse stored videos:", error);
        }
      }
    })();
  }, []);

  const addVideo = async (video: Video) => {
    const newVideos = [...videos, video];
    setVideos(newVideos);
    await LocalStorage.setItem("videos", JSON.stringify(newVideos));
  };

  const removeVideo = async (title: string) => {
    const newVideos = videos.filter((video) => video.title !== title);
    setVideos(newVideos);
    await LocalStorage.setItem("videos", JSON.stringify(newVideos));
  };

  const date = new Date();
  const amPm = date.getHours() >= 12 ? "PM" : "AM";

  return (
    <Grid columns={3}>
      <Grid.Section title={`Cameras: ${new Date().getHours()}:${new Date().getMinutes()}${amPm}`}>
        {videos.map((file) => (
          <FileItem key={file.title} file={file} onRemove={removeVideo} />
        ))}
        <Grid.Item
          title="Add Video"
          content={Icon.Plus}
          actions={
            <ActionPanel>
              <AddVideoAction onAdd={addVideo} />
            </ActionPanel>
          }
        />
      </Grid.Section>
    </Grid>
  );
}

function FileItem({ file, onRemove }: { file: Video; onRemove: (title: string) => void }) {
  // Check if the URL already has a query string
  const separator = file.static.includes("?") ? "&" : "?";
  const imageUrl = `${file.static}${separator}cache_bust=${Date.now()}`;

  return (
    <Grid.Item
      title={`${file.title}`}
      content={imageUrl}
      actions={
        <ActionPanel>
          <Action title="Open Stream" icon={Icon.Globe} onAction={() => open(`${file.stream}`, "com.google.Chrome")} />
          <Action title="Remove Video" icon={Icon.Trash} onAction={() => onRemove(file.title)} />
        </ActionPanel>
      }
    />
  );
}

function AddVideoAction({ onAdd }: { onAdd: (video: Video) => void }) {
  const { push } = useNavigation();
  return <Action title="Add Video" icon={Icon.Plus} onAction={() => push(<AddVideoForm onAdd={onAdd} />)} />;
}

function AddVideoForm({ onAdd }: { onAdd: (video: Video) => void }) {
  const { pop } = useNavigation();
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (values: { title: string; static: string; stream: string }) => {
    setError(null); // Reset error before submitting

    // Validate required fields
    if (!values.title) {
      setError("Title is required");
      return;
    }

    // Validate URL formats if provided
    if (values.static && !isValidUrl(values.static)) {
      setError("Invalid Static Image URL");
      return;
    }
    if (values.stream && !isValidUrl(values.stream)) {
      setError("Invalid Stream URL");
      return;
    }

    onAdd(values);
    await showHUD(`Added: ${values.title}`);
    pop(); // Go back to the previous screen (Frigate plugin)
  };

  // URL validation function
  const isValidUrl = (url: string) => {
    const regex = /^(https?|ftp):\/\/[^\s/$.?#].[^\s]*$/i;
    return regex.test(url);
  };

  return (
    <Form
      searchBarAccessory={
        <Form.LinkAccessory
          target="https://docs.frigate.video/guides/configuring_go2rtc/"
          text="Frigate go2rtc documentation"
        />
      }
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Save Video" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      {error && <Form.Description text={error} />}
      <Form.TextField id="title" title="Title" placeholder="Enter camera name" />
      <Form.TextField id="static" title="Static Image URL" placeholder="Enter snapshot URL" />
      <Form.Description text="Url from go2rtc for static image e.g. http://192.168.0.1:1984/api/frame.jpeg?src=NAME_OF_CAMERA" />
      <Form.TextField id="stream" title="Stream URL" placeholder="Enter stream URL" />
      <Form.Description text="Url from go2rtc for stream e.g. http://192.168.0.1:1984/stream.jpeg?src=NAME_OF_CAMERA" />
    </Form>
  );
}
