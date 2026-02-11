import {
  Action,
  ActionPanel,
  Grid,
  showToast,
  Toast,
  showHUD,
  Icon,
  confirmAlert,
  Alert,
  Color,
  Form,
  useNavigation,
} from "@raycast/api";
import { useState, useEffect } from "react";
import { readdirSync, statSync, unlinkSync, existsSync } from "fs";
import { join, extname, basename } from "path";
import { execSync } from "child_process";
import {
  getImagesFolder,
  ensureFolderExists,
  loadSnippetsData,
  deleteSnippet,
  togglePinSnippet,
  copyImageToClipboard,
  addSnippet,
  updateSnippet,
  generateId,
} from "./utils";
import { ImageSnippet } from "./types";

interface ImageFile {
  id: string;
  fileName: string;
  name: string;
  path: string;
  extension: string;
  keywords: string[];
  pinned: boolean;
  createdAt: string;
}

const SUPPORTED_EXTENSIONS = [
  ".png",
  ".jpg",
  ".jpeg",
  ".gif",
  ".webp",
  ".tiff",
  ".bmp",
];

function getImagesWithMetadata(): ImageFile[] {
  ensureFolderExists();
  const folderPath = getImagesFolder();
  const snippetsData = loadSnippetsData();

  if (!existsSync(folderPath)) {
    return [];
  }

  try {
    const files = readdirSync(folderPath);
    const imageFiles = files.filter((file) => {
      const ext = extname(file).toLowerCase();
      return SUPPORTED_EXTENSIONS.includes(ext);
    });

    return imageFiles
      .map((file) => {
        const filePath = join(folderPath, file);
        const stat = statSync(filePath);

        // find metadata for this file
        const metadata = snippetsData.snippets.find((s) => s.fileName === file);

        if (metadata) {
          return {
            id: metadata.id,
            fileName: file,
            name: metadata.name,
            path: filePath,
            extension: extname(file).toLowerCase(),
            keywords: metadata.keywords,
            pinned: metadata.pinned,
            createdAt: metadata.createdAt,
          };
        }

        // no metadata found, create default
        const baseName = basename(file, extname(file));
        const newId = generateId();

        // auto-add snippet for orphan files
        const newSnippet: ImageSnippet = {
          id: newId,
          fileName: file,
          name: baseName,
          keywords: [],
          pinned: false,
          createdAt: stat.mtime.toISOString(),
        };
        addSnippet(newSnippet);

        return {
          id: newId,
          fileName: file,
          name: baseName,
          path: filePath,
          extension: extname(file).toLowerCase(),
          keywords: [],
          pinned: false,
          createdAt: stat.mtime.toISOString(),
        };
      })
      .sort((a, b) => {
        // pinned first, then by creation date (newest first)
        if (a.pinned && !b.pinned) return -1;
        if (!a.pinned && b.pinned) return 1;
        return (
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
      });
  } catch (error) {
    console.error("Error reading folder:", error);
    return [];
  }
}

// Edit form component
function EditSnippetForm({
  image,
  onSave,
}: {
  image: ImageFile;
  onSave: () => void;
}) {
  const [name, setName] = useState(image.name);
  const [keywords, setKeywords] = useState(image.keywords.join(", "));
  const { pop } = useNavigation();

  async function handleSubmit() {
    if (!name.trim()) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Please enter a name",
      });
      return;
    }

    try {
      updateSnippet(image.id, {
        name: name.trim(),
        keywords: keywords
          .split(",")
          .map((k) => k.trim().toLowerCase())
          .filter((k) => k.length > 0),
      });

      await showToast({
        style: Toast.Style.Success,
        title: `Updated "${name}"`,
      });
      onSave();
      pop(); // retour à browse, pas fermeture de raycast
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to update",
        message: String(error),
      });
    }
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Save Changes"
            icon={Icon.Check}
            onSubmit={handleSubmit}
          />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="name"
        title="Name"
        placeholder="My awesome image"
        value={name}
        onChange={setName}
        autoFocus
      />
      <Form.TextField
        id="keywords"
        title="Keywords"
        placeholder="logo, brand, signature"
        value={keywords}
        onChange={setKeywords}
        info="Comma-separated keywords for quick search"
      />
    </Form>
  );
}

export default function BrowseImages() {
  const [images, setImages] = useState<ImageFile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { push } = useNavigation();

  const loadImages = () => {
    setIsLoading(true);
    const loadedImages = getImagesWithMetadata();
    setImages(loadedImages);
    setIsLoading(false);
  };

  useEffect(() => {
    loadImages();
  }, []);

  const handleCopy = async (image: ImageFile) => {
    try {
      await copyImageToClipboard(image.path);
      await showHUD(`🤠 Copied "${image.name}"!`);
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to copy image",
        message: String(error),
      });
    }
  };

  const handleTogglePin = async (image: ImageFile) => {
    const newPinned = togglePinSnippet(image.id);
    await showToast({
      style: Toast.Style.Success,
      title: newPinned ? "📌 Pinned" : "Unpinned",
      message: image.name,
    });
    loadImages();
  };

  const handleEdit = (image: ImageFile) => {
    push(<EditSnippetForm image={image} onSave={loadImages} />);
  };

  const handleDelete = async (image: ImageFile) => {
    const confirmed = await confirmAlert({
      title: "Delete Image",
      message: `Are you sure you want to delete "${image.name}"?`,
      primaryAction: {
        title: "Delete",
        style: Alert.ActionStyle.Destructive,
      },
    });

    if (confirmed) {
      try {
        unlinkSync(image.path);
        deleteSnippet(image.id);
        await showToast({
          style: Toast.Style.Success,
          title: "Image deleted",
          message: image.name,
        });
        loadImages();
      } catch (error) {
        await showToast({
          style: Toast.Style.Failure,
          title: "Failed to delete image",
          message: String(error),
        });
      }
    }
  };

  const handleRevealInFinder = (image: ImageFile) => {
    execSync(`open -R "${image.path}"`);
  };

  // split into pinned and unpinned for sections
  const pinnedImages = images.filter((img) => img.pinned);
  const unpinnedImages = images.filter((img) => !img.pinned);

  const renderActions = (image: ImageFile) => (
    <ActionPanel>
      <Action
        title="Copy to Clipboard"
        icon={Icon.Clipboard}
        onAction={() => handleCopy(image)}
      />
      <Action
        title="Edit Snippet"
        icon={Icon.Pencil}
        shortcut={{ modifiers: ["cmd"], key: "e" }}
        onAction={() => handleEdit(image)}
      />
      <Action
        title={image.pinned ? "Unpin" : "Pin"}
        icon={image.pinned ? Icon.PinDisabled : Icon.Pin}
        shortcut={{ modifiers: ["cmd", "shift"], key: "p" }}
        onAction={() => handleTogglePin(image)}
      />
      <Action
        title="Reveal in Finder"
        icon={Icon.Finder}
        shortcut={{ modifiers: ["cmd"], key: "o" }}
        onAction={() => handleRevealInFinder(image)}
      />
      <Action
        title="Refresh"
        icon={Icon.ArrowClockwise}
        shortcut={{ modifiers: ["cmd"], key: "r" }}
        onAction={loadImages}
      />
      <Action
        title="Delete Image"
        icon={Icon.Trash}
        style={Action.Style.Destructive}
        shortcut={{ modifiers: ["cmd"], key: "backspace" }}
        onAction={() => handleDelete(image)}
      />
    </ActionPanel>
  );

  return (
    <Grid
      isLoading={isLoading}
      searchBarPlaceholder="Search by name or keyword..."
      columns={5}
      aspectRatio="4/3"
      fit={Grid.Fit.Contain}
      filtering={{
        keepSectionOrder: true,
      }}
    >
      {images.length === 0 && !isLoading ? (
        <Grid.EmptyView
          icon={Icon.Image}
          title="No images found"
          description={`Add images using "Add Image to Snippets" command`}
        />
      ) : (
        <>
          {pinnedImages.length > 0 && (
            <Grid.Section
              title="📌 Pinned"
              subtitle={`${pinnedImages.length} items`}
            >
              {pinnedImages.map((image) => (
                <Grid.Item
                  key={image.id}
                  content={{ source: image.path }}
                  title={image.name}
                  subtitle={
                    image.keywords.length > 0
                      ? image.keywords.join(", ")
                      : undefined
                  }
                  keywords={[image.name, ...image.keywords]}
                  accessory={{
                    icon: { source: Icon.Pin, tintColor: Color.Yellow },
                  }}
                  actions={renderActions(image)}
                />
              ))}
            </Grid.Section>
          )}

          {unpinnedImages.length > 0 && (
            <Grid.Section
              title={pinnedImages.length > 0 ? "All Images" : undefined}
              subtitle={
                pinnedImages.length > 0
                  ? `${unpinnedImages.length} items`
                  : undefined
              }
            >
              {unpinnedImages.map((image) => (
                <Grid.Item
                  key={image.id}
                  content={{ source: image.path }}
                  title={image.name}
                  subtitle={
                    image.keywords.length > 0
                      ? image.keywords.join(", ")
                      : undefined
                  }
                  keywords={[image.name, ...image.keywords]}
                  actions={renderActions(image)}
                />
              ))}
            </Grid.Section>
          )}
        </>
      )}
    </Grid>
  );
}
