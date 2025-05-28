import { ActionPanel, Action, Form, showToast, Toast, useNavigation, Icon } from "@raycast/api";
import { useState } from "react";
import { saveSignature } from "./utils/storage";
import { Signature } from "./types";

export default function CreateSignature({ onSignatureCreated }: { onSignatureCreated?: () => void }) {
  const [name, setName] = useState("");
  const [type, setType] = useState<Signature["type"]>("text");
  const [textContent, setTextContent] = useState("");
  const [font, setFont] = useState<"GreatVibes-Regular" | "Pacifico-Regular">("GreatVibes-Regular");
  const [filePaths, setFilePaths] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { pop } = useNavigation();

  const handleSubmit = async () => {
    if (!name.trim()) {
      showToast(Toast.Style.Failure, "Please enter a signature name");
      return;
    }
    if (type === "text" && !textContent.trim()) {
      showToast(Toast.Style.Failure, "Please enter text content");
      return;
    }
    if (type === "image" && filePaths.length === 0) {
      showToast(Toast.Style.Failure, "Please select an image file");
      return;
    }

    setIsLoading(true);
    try {
      await saveSignature({
        name: name.trim(),
        type,
        content: type === "text" ? textContent.trim() : undefined,
        font: type === "text" ? font : undefined,
        imagePath: type === "image" ? filePaths[0] : undefined,
        createdAt: new Date().toISOString(),
      });
      showToast(Toast.Style.Success, "Signature saved successfully");
      onSignatureCreated?.();
      pop();
    } catch {
      showToast(Toast.Style.Failure, "Failed to save signature");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Form
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Save Signature" icon={Icon.Check} onSubmit={handleSubmit} />
          {type === "image" && (
            <Action.OpenInBrowser
              title="Draw Signature Online"
              url="https://signaturely.com/online-signature/draw/"
              icon={Icon.Link}
            />
          )}
        </ActionPanel>
      }
    >
      <Form.TextField
        id="name"
        title="Signature Name"
        placeholder="Enter a name for your signature"
        value={name}
        onChange={setName}
      />

      <Form.Dropdown
        id="type"
        title="Signature Type"
        value={type}
        onChange={(value) => setType(value as "text" | "image")}
      >
        <Form.Dropdown.Item value="text" title="Text Signature" icon={Icon.Text} />
        <Form.Dropdown.Item value="image" title="Upload Image" icon={Icon.Image} />
      </Form.Dropdown>

      {type === "text" && (
        <>
          <Form.TextArea
            id="textContent"
            title="Signature Text"
            placeholder="Type your signature here"
            value={textContent}
            onChange={setTextContent}
          />
          <Form.Dropdown
            id="font"
            title="Font"
            value={font}
            onChange={(value) => setFont(value as "GreatVibes-Regular" | "Pacifico-Regular")}
          >
            <Form.Dropdown.Item value="GreatVibes-Regular" title="Great Vibes" />
            <Form.Dropdown.Item value="Pacifico-Regular" title="Pacifico" />
          </Form.Dropdown>
          <Form.Description
            title="Tip"
            text="After saving, paste your signature into any app that has the selected font installed to view it correctly."
          />
        </>
      )}

      {type === "image" && (
        <>
          <Form.FilePicker
            id="signatureFile"
            title="Select Image File"
            allowMultipleSelection={false}
            canChooseDirectories={false}
            canChooseFiles={true}
            value={filePaths}
            onChange={setFilePaths}
          />
          <Form.Description
            title="Tip"
            text="To hand‑draw your signature, click “Draw Signature Online” above to open a browser, draw and download your PNG, then upload it here."
          />
        </>
      )}
    </Form>
  );
}
