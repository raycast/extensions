import {
  ActionPanel,
  Form,
  Detail,
  Action,
  showToast,
  Toast,
  useNavigation,
  Clipboard,
  getSelectedFinderItems,
} from "@raycast/api";
import { useEffect, useState } from "react";
import fs from "fs";
import path from "path";
import axios from "axios";
import FormData from "form-data";

export default function Command() {
  const { push } = useNavigation();
  const [selectedImage, setSelectedImage] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(false);

  useEffect(() => {
    async function getSelectedImage() {
      try {
        const items = await getSelectedFinderItems();
        const allowedExtensions = [".jpeg", ".jpg", ".png", ".bmp", ".webp"];
        if (
          items.length === 1 &&
          items[0].path &&
          allowedExtensions.some((ext) => items[0].path.toLowerCase().endsWith(ext))
        ) {
          setSelectedImage(items[0].path);
        }
      } catch (error) {
        return;
      } finally {
        setIsLoading(false);
      }
    }
    getSelectedImage();
  }, []);

  const convertImageToAscii = async (imagePath: string, complex: boolean, width?: number, height?: number) => {
    try {
      setIsLoading(true);
      const formData = new FormData();
      formData.append("file", fs.createReadStream(imagePath));
      formData.append("complex", complex.toString());

      if (width) formData.append("width", width.toString());
      if (height) formData.append("height", height.toString());

      const response = await axios.post("https://ascii-image-converter.zeabur.app/image-to-ascii", formData, {
        headers: {
          ...formData.getHeaders(),
        },
      });

      return response.data;
    } catch (error) {
      console.error("Failed to convert image:", error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (values: { image: string[]; width: string; height: string; complex: boolean }) => {
    if (values.image.length === 0) {
      showToast({
        style: Toast.Style.Failure,
        title: "Please select an image file.",
      });
      return;
    }

    const file = values.image[0];
    const allowedExtensions = [".jpeg", ".jpg", ".png", ".bmp", ".webp"];

    if (!fs.existsSync(file) || fs.lstatSync(file).isDirectory()) {
      showToast({
        style: Toast.Style.Failure,
        title: "Selected file is not valid.",
      });
      return;
    }

    const fileExtension = path.extname(file).toLowerCase();
    if (!allowedExtensions.includes(fileExtension)) {
      showToast({
        style: Toast.Style.Failure,
        title: "Images must be in one of the following formats: " + allowedExtensions.join(", "),
      });
      return;
    }

    let width: number | undefined;
    let height: number | undefined;

    if (values.width.trim() !== "") {
      width = Number(values.width);
      if (isNaN(width) || width <= 0) {
        showToast({
          style: Toast.Style.Failure,
          title: "Width must be a positive number.",
        });
        return;
      }
    }

    if (values.height.trim() !== "") {
      height = Number(values.height);
      if (isNaN(height) || height <= 0) {
        showToast({
          style: Toast.Style.Failure,
          title: "Height must be a positive number.",
        });
        return;
      }
    }

    try {
      const result = await convertImageToAscii(file, values.complex, width, height);

      push(
        <Detail
          markdown={`\`\`\`\n${result}\n\`\`\``}
          actions={
            <ActionPanel>
              <Action
                title="Copy Ascii Image"
                onAction={async () => {
                  await Clipboard.copy(result);
                  showToast({
                    style: Toast.Style.Success,
                    title: "Ascii image copied to clipboard",
                  });
                }}
              />
            </ActionPanel>
          }
        />,
      );

      showToast({
        style: Toast.Style.Success,
        title: "Image converted successfully",
      });
    } catch (error) {
      showToast({
        style: Toast.Style.Failure,
        title: "Failed to convert image",
        message: error instanceof Error ? error.message : String(error),
      });
    }
  };

  return (
    <Form
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Convert to Ascii" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.FilePicker
        id="image"
        allowMultipleSelection={false}
        canChooseDirectories={false}
        canChooseFiles
        title="Select an Image"
        value={selectedImage ? [selectedImage] : []}
        onChange={(values) => setSelectedImage(values[0] || "")}
      />
      <Form.TextField id="width" title="Width" defaultValue="80" />
      <Form.TextField id="height" title="Height" />
      <Form.Description
        title="Note"
        text="If only width or height is provided, the other dimension will be calculated to maintain the aspect ratio."
      />
      <Form.Checkbox
        id="complex"
        title="Complex"
        label="Convert the image with a wider array of ascii characters."
        defaultValue={false}
      />
    </Form>
  );
}
