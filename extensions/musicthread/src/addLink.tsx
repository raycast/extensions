import { Form, ActionPanel, Action, showToast } from "@raycast/api";
import { useEffect, useState } from "react";
import { useAsync } from "react-use";
import ThreadDropdown from "./components/ThreadDropdown";
import { useMusicThreadHttpApi } from "./hooks/useMusicThreadHttpApi";
import { Thread } from "./types/threads.types";
import { Link } from "./types/links.types";

export default function Command() {
  const [_, setSelectedThread] = useState<Thread | null>(null);
  const [isLoadingDisplay, setIsLoadingDisplay] = useState(true);
  const [titleError, setTitleError] = useState<string | undefined>();

  const { getThreads, addLink } = useMusicThreadHttpApi();

  const { value: threads, loading: isLoadingThreads } = useAsync(async () => {
    const result = await getThreads();
    return result;
  }, []);

  useEffect(() => {
    if (!threads) {
      // There is no thread to display.
      if (!isLoadingThreads) {
        setIsLoadingDisplay(false);
      }

      return;
    }

    setSelectedThread(threads[0]);
  }, [threads]);

  function dropTitleErrorIfNeeded() {
    if (titleError && titleError.length > 0) {
      setTitleError(undefined);
    }
  }

  const handleChange = (thread: Thread) => {
    setIsLoadingDisplay(true);
    setSelectedThread(thread);
  };

  function handleSubmit(link: Link) {
    addLink(link);
    showToast({ title: "Link added", message: "Your thread was updated" });
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.Description text="Submit a link below to add it to your MusicThread." />
      <Form.Description text="MusicThread supports Bandcamp, iTunes, Apple Music, Spotify, Soundcloud, Tidal and YouTube Music." />
      <Form.TextField
        id="link"
        title="Link"
        placeholder="Enter link"
        error={titleError}
        onChange={dropTitleErrorIfNeeded}
        onBlur={(event) => {
          if (event.target.value?.length == 0) {
            setTitleError("Please set a link");
          } else {
            dropTitleErrorIfNeeded();
          }
        }}
      />
      <ThreadDropdown threads={threads} onChange={handleChange} isLoading={isLoadingDisplay} />
    </Form>
  );
}
