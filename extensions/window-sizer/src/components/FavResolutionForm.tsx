import { Form, ActionPanel, Action, showToast, Toast, Detail } from "@raycast/api";
import { useState, useEffect } from "react";

interface FavResolutionFormProps {
  onSubmit: (width: number, height: number) => void;
  savedResolution?: { width: number; height: number } | null;
}

export function FavResolutionForm({ onSubmit, savedResolution }: FavResolutionFormProps) {
  const [width, setWidth] = useState<string>("");
  const [height, setHeight] = useState<string>("");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    setIsLoading(false);
  }, []);

  const handleSubmit = () => {
    const widthNum = parseInt(width);
    const heightNum = parseInt(height);

    if (isNaN(widthNum) || isNaN(heightNum) || widthNum <= 0 || heightNum <= 0) {
      showToast({
        style: Toast.Style.Failure,
        title: "Width and height must be positive numbers",
      });
      return;
    }

    onSubmit(widthNum, heightNum);
  };

  const handleApplySavedSize = () => {
    if (savedResolution) {
      onSubmit(savedResolution.width, savedResolution.height);
    }
  };

  if (isLoading) {
    return <Detail isLoading={true} />;
  }

  if (savedResolution) {
    return (
      <Detail
        markdown={`Resize to ${savedResolution.width}×${savedResolution.height}...`}
        actions={
          <ActionPanel>
            <Action
              title={`Resize to ${savedResolution.width}×${savedResolution.height}`}
              onAction={handleApplySavedSize}
            />
          </ActionPanel>
        }
      />
    );
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action title="Save and Resize" onAction={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.Description text="Set your Favorite Size" />
      <Form.Separator />
      <Form.TextField id="width" title="Width" placeholder="Enter Width" value={width} onChange={setWidth} />
      <Form.TextField id="height" title="Height" placeholder="Enter Height" value={height} onChange={setHeight} />
    </Form>
  );
}
