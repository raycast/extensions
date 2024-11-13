import { showToast, Toast, open, popToRoot } from "@raycast/api";
import { createInboxItem } from "./api/client";
import { useEffect, useRef } from "react";

interface Arguments {
  title: string;
  notes?: string;
}

export default function Command(props: { arguments: Arguments }) {
  const isSubmitting = useRef(false);

  useEffect(() => {
    async function addItem() {
      // Prevent double submission
      if (isSubmitting.current) {
        return;
      }

      isSubmitting.current = true;

      const toast = await showToast({
        style: Toast.Style.Animated,
        title: "Adding to March Inbox...",
      });

      try {
        const { title, notes } = props.arguments;
        await createInboxItem(title, notes);

        toast.style = Toast.Style.Success;
        toast.title = "Added to March Inbox";
        toast.message = title;

        toast.primaryAction = {
          title: "Open in March",
          onAction: () => {
            open("https://app.march.cat/inbox");
          },
        };

        await popToRoot();
      } catch (error) {
        toast.style = Toast.Style.Failure;
        toast.title = "Failed to Add Item";
        toast.message = error instanceof Error ? error.message : "An unexpected error occurred";
      } finally {
        isSubmitting.current = false;
      }
    }

    addItem();
  }, []); // Empty dependency array since we don't need to re-run

  return null;
}
