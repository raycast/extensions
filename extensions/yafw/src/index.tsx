import {
  Action,
  ActionPanel,
  Clipboard,
  FileSystemItem,
  Form,
  Toast,
  getSelectedFinderItems,
  showToast,
  useNavigation,
} from "@raycast/api";
import { useEffect, useState } from "react";
import { COMPRESSION_OPTIONS, CompressionOptionKey, DEFAULT_COMPRESSION, VIDEO_FORMATS } from "./constants";
import {
  capitalizeSnakeCase,
  compressVideoFiles,
  fileExists,
  fileName,
  isFileFormatSupported,
  normalizeFilePath,
  unique,
} from "./utils";
import { Videos } from "./videos";

export default function Command() {
  const [files, _setFiles] = useState<string[]>([]);
  const [removedFiles, setRemovedFiles] = useState<string[]>([]);
  const [clipboard, setClipboard] = useState<Clipboard.ReadContent | null>(null);
  const [selectedFinderItems, setSelectedFinderItems] = useState<FileSystemItem[] | null>(null);
  const [autoLoaded, setAutoLoaded] = useState(false);
  const [compression, setCompression] = useState<CompressionOptionKey>(DEFAULT_COMPRESSION);
  const navigation = useNavigation();

  // Fake hook setter to ensure that perform some wanted operations
  const setFiles = (newFiles: string[], automaticallyAdded = false) => {
    newFiles = unique(newFiles.map(normalizeFilePath));

    const isFileBeingRemoved = newFiles.length < files.length;
    if (isFileBeingRemoved) {
      const fileBeingRemoved = files.find((file) => !newFiles.includes(file));
      setRemovedFiles([...removedFiles, fileBeingRemoved!]);
    } else if (automaticallyAdded) {
      setAutoLoaded(true);
      // avoid adding files that we automatically added but the user removed
      newFiles = newFiles.filter((file) => !removedFiles.includes(file));
    } else {
      // all new legit files should be deleted from the removed files list
      setRemovedFiles(removedFiles.filter((file) => !newFiles.includes(file)));
    }

    newFiles = newFiles.filter(fileExists);

    return _setFiles(newFiles);
  };

  useEffect(() => {
    const lookForVideoSources = () => {
      Clipboard.read().then(setClipboard);
      getSelectedFinderItems()
        .then(setSelectedFinderItems)
        .catch(() => setSelectedFinderItems([]));
    };
    lookForVideoSources();
  }, [setClipboard, setSelectedFinderItems]);

  useEffect(() => {
    if (clipboard && "file" in clipboard && !files.includes(clipboard.file!)) {
      if (clipboard.file && isFileFormatSupported(clipboard.file)) {
        setFiles([...files, clipboard.file!], true);
      }
    }
  }, [clipboard]);

  useEffect(() => {
    if (selectedFinderItems) {
      for (const item of selectedFinderItems) {
        if (item.path && isFileFormatSupported(item.path)) {
          setFiles([...files, item.path], true);
        }
      }
    }
  }, [selectedFinderItems]);

  useEffect(() => {
    for (const file of files) {
      if (!isFileFormatSupported(file)) {
        showToast({
          title: "Invalid file",
          message: `The file "${fileName(file)}" is not a valid video file. Supported formats are: ${VIDEO_FORMATS.join(", ")}`,
          style: Toast.Style.Failure,
        });
        setFiles(files.filter((f) => f !== file));
        return;
      }
    }
  }, [files]);

  const onSubmit = async () => {
    if (files.length === 0) {
      showToast({
        title: "Select videos first",
        style: Toast.Style.Failure,
      });

      return;
    }
    compressVideoFiles(files, compression).then((successfulFiles) => {
      if (successfulFiles.length === 0) return;
      successfulFiles.forEach((file) => Clipboard.copy({ file }));
      navigation.push(<Videos files={successfulFiles} />);
    });
  };

  return (
    <Form
      isLoading={!clipboard || !selectedFinderItems}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Compress Files" onSubmit={onSubmit} />
        </ActionPanel>
      }
    >
      {autoLoaded && files.length > 0 ? (
        <Form.Description text="✔︎ Loaded files from your clipboard or Finder" />
      ) : (
        <Form.Description text="You can also copy some videos or select them in the Finder and launch this command again" />
      )}
      <Form.FilePicker
        id="files"
        value={files}
        onChange={setFiles}
        allowMultipleSelection
        title="Choose Video Files"
        info="Any files you copy or select in the Finder will show up here"
      />
      <Form.Dropdown
        id="compression"
        title="Compression"
        value={compression}
        onChange={(value) => setCompression(value as CompressionOptionKey)}
      >
        {Object.keys(COMPRESSION_OPTIONS).map((key) => (
          <Form.Dropdown.Item key={key} value={key} title={capitalizeSnakeCase(key)} />
        ))}
      </Form.Dropdown>
    </Form>
  );
}
