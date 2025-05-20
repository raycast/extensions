import React from "react";
import { Form, ActionPanel, Action, showToast, Toast, LaunchProps } from "@raycast/api";
import { useForm, FormValidation } from "@raycast/utils";
import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

interface VideoUpdateFormValues {
  athleteName: string;
  youtubeLink: string;
  season: string;
  videoType: string;
}

export default function Command(props: LaunchProps<{ draftValues: VideoUpdateFormValues }>) {
  const { handleSubmit, itemProps, reset, focus } = useForm<VideoUpdateFormValues>({
    async onSubmit(formValues) {
      const toast = await showToast({
        style: Toast.Style.Animated,
        title: "Processing video update...",
      });

      try {
        const absoluteScriptPath = "/Users/singleton23/Desktop/RAYCAST/Playwright/playerID_updates.py";

        // Construct the command - always non-headless
        const command = `python3 "${absoluteScriptPath}" "${formValues.athleteName}" "${formValues.youtubeLink}" "${formValues.season}" "${formValues.videoType}"`;

        await toast.show();
        toast.title = "Executing automation script...";
        toast.message = "This might take a moment. Browser window will open.";

        console.log("Executing command:", command);
        const { stdout, stderr } = await execAsync(command);

        console.log("Script stdout:", stdout);
        if (stderr) {
          console.error("Script stderr:", stderr);
          toast.style = Toast.Style.Failure;
          toast.title = "Script Error";
          toast.message = stderr.substring(0, 200) + (stderr.length > 200 ? "..." : "");
          return;
        }

        toast.style = Toast.Style.Success;
        toast.title = "Video Update Successful";
        toast.message = "Athlete's profile has been updated (pending manual confirmation if any).";
        reset(); // Clear the form
      } catch (error: unknown) {
        console.error("Execution error:", error);
        toast.style = Toast.Style.Failure;
        toast.title = "Failed to Update Video";
        if (error instanceof Error) {
          toast.message = error.message || "An unexpected error occurred.";
        } else {
          toast.message = "An unexpected error occurred.";
        }
        // Check if stdout and stderr exist on the error object before accessing them
        if (typeof error === "object" && error !== null) {
          if ("stdout" in error && (error as { stdout: unknown }).stdout) {
            console.error("Error stdout:", (error as { stdout: unknown }).stdout);
          }
          if ("stderr" in error && (error as { stderr: unknown }).stderr) {
            console.error("Error stderr:", (error as { stderr: unknown }).stderr);
          }
        }
      }
    },
    validation: {
      athleteName: FormValidation.Required,
      youtubeLink: (value) => {
        if (!value) return "The item is required";
        if (!value.startsWith("https://www.youtube.com/") && !value.startsWith("https://youtu.be/")) {
          return "Please enter a valid YouTube link (e.g., https://www.youtube.com/watch?v=... or https://youtu.be/...)";
        }
        return undefined;
      },
      season: FormValidation.Required,
      videoType: FormValidation.Required,
    },
    initialValues: props.draftValues || {
      athleteName: "",
      youtubeLink: "",
      season: "Junior Season",
      videoType: "Highlights",
    },
  });

  return (
    <Form
      enableDrafts
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Submit and Run Automation" onSubmit={handleSubmit} />
          <Action
            title="Focus Athlete Name"
            onAction={() => focus("athleteName")}
            shortcut={{ modifiers: ["cmd", "shift"], key: "a" }}
          />
          <Action
            title="Focus Youtube Link"
            onAction={() => focus("youtubeLink")}
            shortcut={{ modifiers: ["cmd", "shift"], key: "y" }}
          />
        </ActionPanel>
      }
    >
      <Form.Description text="Enter the athlete's details to update their video profile. The browser will open visibly." />
      <Form.Separator />

      <Form.TextField
        title="Student Athlete's Name"
        placeholder="Enter full name"
        {...itemProps.athleteName}
        autoFocus
      />
      <Form.TextField
        title="YouTube Link"
        placeholder="e.g., https://www.youtube.com/watch?v=..."
        {...itemProps.youtubeLink}
      />

      <Form.Dropdown title="Season" {...itemProps.season}>
        <Form.Dropdown.Item value="8th Grade Season" title="8th Grade Season" />
        <Form.Dropdown.Item value="Freshman Season" title="Freshman Season" />
        <Form.Dropdown.Item value="Sophomore Season" title="Sophomore Season" />
        <Form.Dropdown.Item value="Junior Season" title="Junior Season" />
        <Form.Dropdown.Item value="Senior Season" title="Senior Season" />
      </Form.Dropdown>

      <Form.Dropdown title="Video Type" {...itemProps.videoType}>
        <Form.Dropdown.Item value="Highlights" title="Highlights" />
        <Form.Dropdown.Item value="Skills" title="Skills" />
        <Form.Dropdown.Item value="Highlights | Skills" title="Highlights | Skills" />
      </Form.Dropdown>
    </Form>
  );
}
