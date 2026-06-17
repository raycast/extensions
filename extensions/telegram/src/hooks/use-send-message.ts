import { useState } from "react";
import * as fs from "fs";
import { showToast, Toast, popToRoot } from "@raycast/api";
import { useForm } from "@raycast/utils";
import { sendMessage } from "../services/telegram-client";
import { getConfig, ensureAuthenticated } from "../utils/auth";

interface SendMessageFormValues {
  message: string;
  files: string[];
}

interface UseSendMessageOptions {
  chatId: string;
  onBeforeSubmit?: () => Promise<boolean> | boolean;
  onSuccess?: (params: { chatId: string; message: string }) => Promise<void> | void;
}

export function useSendMessage({ chatId, onBeforeSubmit, onSuccess }: UseSendMessageOptions) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { handleSubmit, itemProps } = useForm<SendMessageFormValues>({
    onSubmit: async (values) => {
      if (onBeforeSubmit) {
        const shouldContinue = await onBeforeSubmit();
        if (!shouldContinue) {
          return;
        }
      }

      setIsSubmitting(true);
      try {
        await handleSendMessage({
          chatId,
          message: values.message,
          files: values.files,
        });

        if (onSuccess) {
          await onSuccess({ chatId, message: values.message });
        } else {
          await showToast({
            style: Toast.Style.Success,
            title: "Message Sent",
          });
          await popToRoot();
        }
      } catch (error) {
        await showToast({
          style: Toast.Style.Failure,
          title: "Failed to Send Message",
          message: error instanceof Error ? error.message : "Unknown error occurred",
        });
      } finally {
        setIsSubmitting(false);
      }
    },
    validation: {
      files: validateFiles,
    },
  });

  return { handleSubmit, itemProps, isSubmitting };
}

function validateFiles(files: string[] | undefined): string | undefined {
  if (files && files.length > 0) {
    for (const filePath of files) {
      if (!fs.existsSync(filePath)) {
        return `File not found: ${filePath}`;
      }
    }
  }
}

async function handleSendMessage({
  chatId,
  message,
  files,
}: {
  chatId: string;
  message: string;
  files: string[];
}): Promise<void> {
  const authenticated = await ensureAuthenticated();
  if (!authenticated) {
    return;
  }

  const config = getConfig();

  await sendMessage({
    config,
    chatId,
    message,
    filePaths: files || [],
  });
}
