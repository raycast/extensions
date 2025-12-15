import { useEffect, useState } from "react";
import {
  Action,
  ActionPanel,
  Form,
  getPreferenceValues,
  showToast,
  Toast,
} from "@raycast/api";
import { useForm } from "@raycast/utils";
import fs from "fs";
import path from "path";
import simpleGit from "simple-git";
import { getActiveUrl, fetchMetadata } from "@rlog/shared";

interface Preferences {
  blogPath: string;
  dataPath: string;
}

interface ReadingEntry {
  url: string;
  title: string;
  author: string | null;
  publishedDate: string | null;
  addedDate: string;
  thoughts?: string;
}

// Could display Title and Author fields for user to manually verify and edit
interface FormValues {
  url: string;
  thoughts: string;
  date: Date | null;
  pushToGit: boolean;
}

export default function Command() {
  const preferences = getPreferenceValues<Preferences>();
  const [isLoading, setIsLoading] = useState(false);

  const { handleSubmit, itemProps, reset, setValue } = useForm<FormValues>({
    initialValues: {
      url: "",
      thoughts: "",
      date: new Date(),
      pushToGit: false,
    },
    onSubmit: async (values) => {
      setIsLoading(true);
      const toast = await showToast({
        style: Toast.Style.Animated,
        title: "Processing...",
      });

      try {
        // 1. Fetch Metadata
        const { title, author, publishedDate } = await fetchMetadata(
          values.url,
        );

        // 2. Prepare Entry
        const entry: ReadingEntry = {
          url: values.url,
          title: title.trim(),
          author: author ? author.trim() : null,
          publishedDate: publishedDate ? publishedDate.split("T")[0] : null,
          addedDate: (values.date || new Date()).toISOString().split("T")[0],
          thoughts: values.thoughts.trim() || undefined,
        };

        // 3. Read/Write File
        const fullPath = path.join(preferences.blogPath, preferences.dataPath);

        if (!fs.existsSync(fullPath)) {
          // Ensure directory exists
          fs.mkdirSync(path.dirname(fullPath), { recursive: true });
          fs.writeFileSync(fullPath, "[]");
        }

        const fileContent = fs.readFileSync(fullPath, "utf-8");
        let readings: ReadingEntry[] = [];
        try {
          readings = JSON.parse(fileContent);
        } catch (e) {
          readings = [];
        }

        readings.unshift(entry);
        // Sort by addedDate descending
        readings.sort(
          (a, b) =>
            new Date(b.addedDate).getTime() - new Date(a.addedDate).getTime(),
        );

        fs.writeFileSync(fullPath, JSON.stringify(readings, null, 2));

        // 4. Git Integration
        if (values.pushToGit) {
          toast.title = "Pushing to Git...";
          const git = simpleGit(preferences.blogPath);
          await git.add(preferences.dataPath);
          await git.commit(`chore: Just read "${entry.title}"`);
          await git.push();
        }

        toast.style = Toast.Style.Success;
        toast.title = "Added to Reading List";

        // Reset form to initial values
        reset({
          url: "",
          thoughts: "",
          date: new Date(),
          pushToGit: false,
        });
      } catch (error) {
        toast.style = Toast.Style.Failure;
        toast.title = "Failed to log read";
        toast.message = String(error);
      } finally {
        setIsLoading(false);
      }
    },
    validation: {
      url: (value) => {
        if (!value) return "The item is required";
        try {
          new URL(value);
        } catch (e) {
          return "Invalid URL";
        }
      },
    },
  });

  // Auto-fill URL from Browser (Primary) or Clipboard (Fallback)
  useEffect(() => {
    async function fetchUrl() {
      const url = await getActiveUrl();
      if (url) {
        console.log("Setting URL:", url);
        setValue("url", url);
      }
    }

    fetchUrl();
  }, []);

  return (
    <Form
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField
        title="URL"
        placeholder="https://example.com/article"
        {...itemProps.url}
      />
      <Form.TextArea
        title="Thoughts"
        placeholder="Optional thoughts..."
        {...itemProps.thoughts}
      />
      {/* Can't default to past dates e.g. last week, last month, user must do this manually */}
      <Form.DatePicker title="Date Added" {...itemProps.date} />
      {/* <Form.DatePicker
        title="Date Added"
        type={Form.DatePicker.Type.Date}
        max={new Date()}
        {...itemProps.date}
      /> */}
      <Form.Checkbox label="Push to Git" {...itemProps.pushToGit} />
    </Form>
  );
}
