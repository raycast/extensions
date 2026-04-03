import {
  Action,
  ActionPanel,
  Clipboard,
  Form,
  Toast,
  showHUD,
  showToast,
  useNavigation,
} from "@raycast/api";
import { useEffect, useState } from "react";
import * as drive from "../drive";
import { parseTitle } from "../parse-title";
import * as path from "path";

interface Props {
  initialFilePath?: string;
}

export function FileSongForm({ initialFilePath }: Props) {
  const { pop } = useNavigation();

  const [folder, setFolder] = useState<"ROSTER" | "PROSPECTS">("ROSTER");
  const [artists, setArtists] = useState<drive.Artist[]>([]);
  const [artistId, setArtistId] = useState<string>("");
  const [artistName, setArtistName] = useState<string>("");
  const [filePaths, setFilePaths] = useState<string[]>(
    initialFilePath ? [initialFilePath] : [],
  );
  const [songTitle, setSongTitle] = useState<string>(
    initialFilePath ? parseTitle(path.basename(initialFilePath)) : "",
  );
  const [loadingArtists, setLoadingArtists] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [artistsLoadError, setArtistsLoadError] = useState<boolean>(false);

  // Load artists when folder changes
  useEffect(() => {
    setLoadingArtists(true);
    setArtistId("");
    setArtistName("");
    setArtistsLoadError(false);
    drive
      .listArtists(folder)
      .then((list) => {
        setArtists(list);
        if (list.length > 0) {
          setArtistId(list[0].id);
          setArtistName(list[0].name);
        }
      })
      .catch((err: unknown) => {
        setArtistsLoadError(true);
        const msg = err instanceof Error ? err.message : String(err);
        showToast({
          style: Toast.Style.Failure,
          title: "Failed to load artists",
          message: msg,
        });
      })
      .finally(() => setLoadingArtists(false));
  }, [folder]);

  // Update song title when file changes
  function handleFileChange(paths: string[]) {
    setFilePaths(paths);
    if (paths.length > 0) {
      setSongTitle(parseTitle(path.basename(paths[0])));
    }
  }

  async function handleSubmit() {
    if (filePaths.length === 0 || !artistId || !songTitle.trim()) return;

    setSubmitting(true);
    const filePath = filePaths[0];
    const fileName = path.basename(filePath);
    const selectedArtist = artists.find((a) => a.id === artistId);
    const artist = selectedArtist?.name ?? artistName;

    try {
      await showToast({
        style: Toast.Style.Animated,
        title: "Finding RECORDINGS folder…",
      });
      const recordingsFolderId = await drive.getRecordingsFolderId(artistId);

      await showToast({
        style: Toast.Style.Animated,
        title: "Creating song folder…",
      });
      const songFolderId = await drive.getOrCreateSongFolder(
        recordingsFolderId,
        songTitle.trim(),
      );

      await showToast({
        style: Toast.Style.Animated,
        title: "Uploading file…",
      });
      const fileId = await drive.uploadFile(filePath, fileName, songFolderId);

      await showToast({ style: Toast.Style.Animated, title: "Making public…" });
      try {
        await drive.makePublic(fileId);
      } catch {
        const driveUrl = `https://drive.google.com/file/d/${fileId}/view`;
        await Clipboard.copy(driveUrl);
        await showToast({
          style: Toast.Style.Failure,
          title: "Filed but couldn't make public — Drive URL copied",
        });
        pop();
        return;
      }

      let link: string | null = null;
      try {
        link = await drive.getShareLink(fileId);
      } catch {
        // share link failed — still show success
      }

      if (link) {
        await Clipboard.copy(link);
        await showHUD(
          `Filed to ${folder} > ${artist} > RECORDINGS > ${songTitle.trim()} — link copied`,
        );
      } else {
        await showHUD(
          `Filed to ${folder} > ${artist} > RECORDINGS > ${songTitle.trim()} — link unavailable`,
        );
      }

      pop();
    } catch (err: unknown) {
      await showToast({
        style: Toast.Style.Failure,
        title:
          err instanceof Error && err.message
            ? err.message
            : "Something went wrong",
      });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Form
      isLoading={loadingArtists || submitting}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="File Song" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.FilePicker
        id="file"
        title="File"
        value={filePaths}
        onChange={handleFileChange}
        allowMultipleSelection={false}
      />
      <Form.Dropdown
        id="folder"
        title="Folder"
        value={folder}
        onChange={(val) => setFolder(val as "ROSTER" | "PROSPECTS")}
      >
        <Form.Dropdown.Item value="ROSTER" title="ROSTER" />
        <Form.Dropdown.Item value="PROSPECTS" title="PROSPECTS" />
      </Form.Dropdown>
      <Form.Dropdown
        id="artist"
        title="Artist"
        value={artistId}
        info={
          artistsLoadError
            ? "Failed to load — check your network connection and try again"
            : undefined
        }
        onChange={(val) => {
          setArtistId(val);
          const found = artists.find((a) => a.id === val);
          if (found) setArtistName(found.name);
        }}
      >
        {artists.map((a) => (
          <Form.Dropdown.Item key={a.id} value={a.id} title={a.name} />
        ))}
      </Form.Dropdown>
      <Form.TextField
        id="songTitle"
        title="Song Title"
        placeholder="e.g. One More Day"
        value={songTitle}
        onChange={setSongTitle}
      />
    </Form>
  );
}
