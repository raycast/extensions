import {
  Action,
  ActionPanel,
  Form,
  Icon,
  List,
  showToast,
  Toast,
  useNavigation,
  open,
  getSelectedFinderItems,
} from '@raycast/api';
import { useState, useEffect } from 'react';
import * as fs from 'fs';
import * as path from 'path';

interface FileItem {
  name: string;
  newName: string;
  fullPath: string;
  extension: string;
}

const IMAGE_EXTENSIONS = [
  '.jpg',
  '.jpeg',
  '.png',
  '.gif',
  '.webp',
  '.bmp',
  '.tiff',
  '.tif',
  '.heic',
  '.heif',
  '.svg',
];

export default function BatchRename() {
  const [selectedFiles, setSelectedFiles] = useState<FileItem[]>([]);
  const [keyword, setKeyword] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [renamedFiles, setRenamedFiles] = useState<FileItem[]>([]);

  useEffect(() => {
    loadSelectedFiles();
  }, []);

  const loadSelectedFiles = async () => {
    setIsLoading(true);
    try {
      const finderItems = await getSelectedFinderItems();

      // Filter for image files only
      const imageFiles: FileItem[] = finderItems
        .filter((item: { path: string }) => {
          const ext = path.extname(item.path).toLowerCase();
          return IMAGE_EXTENSIONS.includes(ext) && fs.statSync(item.path).isFile();
        })
        .map((item: { path: string }) => {
          const ext = path.extname(item.path).toLowerCase();
          return {
            name: path.basename(item.path),
            newName: '',
            fullPath: item.path,
            extension: ext,
          };
        });

      setSelectedFiles(imageFiles);

      if (imageFiles.length === 0) {
        showToast({
          style: Toast.Style.Failure,
          title: 'No images selected',
          message: 'Please select image files in Finder',
        });
      }
    } catch (error) {
      showToast({
        style: Toast.Style.Failure,
        title: 'Error loading selected files',
        message: String(error),
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (selectedFiles.length === 0 || !keyword.trim()) {
      setRenamedFiles([]);
      return;
    }

    // Generate new names: keyword-image-000.jpg format
    const sanitizedKeyword = keyword
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9-]/g, '-') // Replace non-alphanumeric with hyphens
      .replace(/-+/g, '-') // Replace multiple hyphens with single
      .replace(/^-|-$/g, ''); // Remove leading/trailing hyphens

    const updatedFiles = selectedFiles.map((file, index) => {
      const number = String(index).padStart(3, '0');
      const newName = `${sanitizedKeyword}-image-${number}${file.extension}`;
      return { ...file, newName };
    });

    setRenamedFiles(updatedFiles);
  }, [selectedFiles, keyword]);

  const handleRename = async () => {
    if (renamedFiles.length === 0) {
      showToast({
        style: Toast.Style.Failure,
        title: 'No files to rename',
        message: 'Please select images and enter a keyword',
      });
      return;
    }

    if (!keyword.trim()) {
      showToast({
        style: Toast.Style.Failure,
        title: 'Keyword required',
        message: 'Please enter a keyword for the filenames',
      });
      return;
    }

    try {
      // Get the directory of the first file
      const firstFileDir = path.dirname(renamedFiles[0].fullPath);
      const renamedDir = path.join(firstFileDir, 'Renamed');

      // Create "Renamed" folder if it doesn't exist
      if (!fs.existsSync(renamedDir)) {
        fs.mkdirSync(renamedDir, { recursive: true });
      }

      // Copy files with new names to the Renamed folder
      let successCount = 0;
      for (const file of renamedFiles) {
        const sourcePath = file.fullPath;
        const destPath = path.join(renamedDir, file.newName);

        // Copy file (not move)
        fs.copyFileSync(sourcePath, destPath);
        successCount++;
      }

      showToast({
        style: Toast.Style.Success,
        title: 'Files renamed and copied',
        message: `${successCount} image(s) copied to "Renamed" folder`,
      });

      // Open the Renamed folder in Finder
      open(renamedDir);
    } catch (error) {
      showToast({
        style: Toast.Style.Failure,
        title: 'Error processing files',
        message: String(error),
      });
    }
  };

  if (isLoading) {
    return (
      <List>
        <List.EmptyView icon={Icon.CircleProgress} title="Loading selected images..." />
      </List>
    );
  }

  if (selectedFiles.length === 0) {
    return (
      <List>
        <List.EmptyView
          icon={Icon.Image}
          title="No Images Selected"
          description="Step 1: Select image files in Finder, then run this command again"
          actions={
            <ActionPanel>
              <Action
                title="Reload Selected Files"
                icon={Icon.ArrowClockwise}
                onAction={loadSelectedFiles}
                shortcut={{ modifiers: ['cmd'], key: 'r' }}
              />
            </ActionPanel>
          }
        />
      </List>
    );
  }

  return (
    <List
      searchBarPlaceholder="Enter keyword for filenames..."
      onSearchTextChange={setKeyword}
      searchBarAccessory={
        <List.Dropdown tooltip="Actions" defaultValue="preview">
          <List.Dropdown.Item title="Preview" value="preview" />
        </List.Dropdown>
      }
    >
      {!keyword.trim() ? (
        <List.EmptyView
          icon={Icon.TextInput}
          title="Step 2: Enter Keyword"
          description={`${selectedFiles.length} image${selectedFiles.length !== 1 ? 's' : ''} selected. Type a keyword above to generate SEO-friendly filenames (e.g., 'product-photo')`}
          actions={
            <ActionPanel>
              <Action
                title="Reload Selected Files"
                icon={Icon.ArrowClockwise}
                onAction={loadSelectedFiles}
              />
            </ActionPanel>
          }
        />
      ) : (
        <>
          <List.Section title="Ready to Rename">
            <List.Item
              title="Create Renamed Files"
              subtitle={`${selectedFiles.length} image${selectedFiles.length !== 1 ? 's' : ''} will be copied to "Renamed" folder`}
              icon={Icon.Rocket}
              accessories={[
                {
                  text: `Keyword: ${keyword}`,
                },
              ]}
              actions={
                <ActionPanel>
                  <Action
                    title="Create Renamed Files"
                    icon={Icon.Checkmark}
                    onAction={handleRename}
                    shortcut={{ modifiers: ['cmd'], key: 'enter' }}
                  />
                  <Action.Push
                    title="Edit Keyword"
                    icon={Icon.Pencil}
                    target={<KeywordEditor keyword={keyword} onUpdate={setKeyword} />}
                  />
                  <Action
                    title="Reload Selected Files"
                    icon={Icon.ArrowClockwise}
                    onAction={loadSelectedFiles}
                  />
                </ActionPanel>
              }
            />
          </List.Section>
          <List.Section title="Configuration">
            <List.Item
              title={`Keyword: ${keyword}`}
              subtitle={`Will create: ${keyword.toLowerCase().replace(/[^a-z0-9-]/g, '-')}-image-000.jpg`}
              icon={Icon.Tag}
              actions={
                <ActionPanel>
                  <Action
                    title="Create Renamed Files"
                    icon={Icon.Checkmark}
                    onAction={handleRename}
                    shortcut={{ modifiers: ['cmd'], key: 'enter' }}
                  />
                  <Action.Push
                    title="Edit Keyword"
                    icon={Icon.Pencil}
                    target={<KeywordEditor keyword={keyword} onUpdate={setKeyword} />}
                  />
                </ActionPanel>
              }
            />
            <List.Item
              title={`${selectedFiles.length} image${selectedFiles.length !== 1 ? 's' : ''} selected`}
              subtitle={`Will be copied to "Renamed" folder`}
              icon={Icon.Image}
              actions={
                <ActionPanel>
                  <Action
                    title="Create Renamed Files"
                    icon={Icon.Checkmark}
                    onAction={handleRename}
                    shortcut={{ modifiers: ['cmd'], key: 'enter' }}
                  />
                  <Action
                    title="Reload Selected Files"
                    icon={Icon.ArrowClockwise}
                    onAction={loadSelectedFiles}
                  />
                </ActionPanel>
              }
            />
          </List.Section>
          <List.Section
            title={`Preview (${renamedFiles.length} files)`}
            subtitle="Files will be copied (not moved) to the Renamed folder"
          >
            {renamedFiles.map((file, index) => (
              <List.Item
                key={index}
                title={file.newName}
                subtitle={`from: ${file.name}`}
                icon={Icon.ArrowRight}
                accessories={[
                  {
                    text: 'Will copy',
                    icon: Icon.Checkmark,
                  },
                ]}
                actions={
                  <ActionPanel>
                    <Action
                      title="Create Renamed Files"
                      icon={Icon.Checkmark}
                      onAction={handleRename}
                      shortcut={{ modifiers: ['cmd'], key: 'enter' }}
                    />
                    <Action.Push
                      title="Edit Keyword"
                      icon={Icon.Pencil}
                      target={<KeywordEditor keyword={keyword} onUpdate={setKeyword} />}
                    />
                    <Action
                      title="Reload Selected Files"
                      icon={Icon.ArrowClockwise}
                      onAction={loadSelectedFiles}
                    />
                  </ActionPanel>
                }
              />
            ))}
          </List.Section>
        </>
      )}
    </List>
  );
}

function KeywordEditor({
  keyword: initialKeyword,
  onUpdate,
}: {
  keyword: string;
  onUpdate: (keyword: string) => void;
}) {
  const [keyword, setKeyword] = useState(initialKeyword);
  const { pop } = useNavigation();

  const handleSubmit = () => {
    if (keyword.trim()) {
      onUpdate(keyword.trim());
      pop();
    } else {
      showToast({
        style: Toast.Style.Failure,
        title: 'Keyword required',
        message: 'Please enter a keyword',
      });
    }
  };

  const sanitizedKeyword = keyword
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Apply Keyword" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="keyword"
        title="Keyword"
        placeholder="e.g., product-photo, vacation-images"
        value={keyword}
        onChange={setKeyword}
        info="This will be used to create SEO-friendly filenames"
      />
      {keyword.trim() && (
        <Form.Description
          title="Preview"
          text={`Files will be named: ${sanitizedKeyword || 'keyword'}-image-000.jpg, ${sanitizedKeyword || 'keyword'}-image-001.jpg, etc.`}
        />
      )}
      <Form.Description
        title="Tip"
        text="Use lowercase letters, numbers, and hyphens. Special characters will be converted to hyphens."
      />
    </Form>
  );
}
