import { showToast, Toast } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { useState } from "react";
import type { CreateIssueParams } from "../api/issues";
import { createIssue } from "../services/issues";

export function useCreateIssueMutation() {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const submit = async (params: CreateIssueParams): Promise<boolean> => {
    setIsSubmitting(true);
    try {
      await createIssue(params);
      await showToast({ style: Toast.Style.Success, title: "Issue created" });
      return true;
    } catch (error) {
      await showFailureToast(error, { title: "Failed to create issue" });
      return false;
    } finally {
      setIsSubmitting(false);
    }
  };

  return { createIssue: submit, isSubmitting };
}
