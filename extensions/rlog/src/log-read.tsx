import { useState } from "react";
import {
  Action,
  ActionPanel,
  Form,
  getPreferenceValues,
  showToast,
  Toast,
} from "@raycast/api";
import { useForm, showFailureToast } from "@raycast/utils";
import fs from "fs";
import path from "path";
import simpleGit from "simple-git";
import { fetchMetadata, requireBlogPath } from "./utils";
import { ReadingFields, useActiveUrlAutofill, validateUrl } from "./components";

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
  rating?: number;
}

// Could display Title and Author fields for user to manually verify and edit
interface FormValues {
  url: string;
  thoughts: string;
  rating: string;
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
      rating: "",
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
        requireBlogPath(preferences.blogPath);

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
          rating: values.rating ? parseInt(values.rating, 10) : undefined,
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

        // 4. Remove from Reading List (if it exists there)
        const readingListPath = path.join(
          preferences.blogPath,
          "data",
          "reading_list.json",
        );
        if (fs.existsSync(readingListPath)) {
          try {
            const readingListContent = fs.readFileSync(
              readingListPath,
              "utf-8",
            );
            let readingList = JSON.parse(readingListContent);
            const originalLength = readingList.length;
            readingList = readingList.filter(
              (item: { url: string }) => item.url !== values.url,
            );
            if (readingList.length < originalLength) {
              fs.writeFileSync(
                readingListPath,
                JSON.stringify(readingList, null, 2),
              );
              console.log("Removed from reading list:", values.url);
            }
          } catch (e) {
            console.error("Failed to update reading list:", e);
          }
        }

        // 5. Git Integration
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
          rating: "",
          date: new Date(),
          pushToGit: false,
        });
      } catch (error) {
        await showFailureToast(error, { title: "Failed to log read" });
      } finally {
        setIsLoading(false);
      }
    },
    validation: { url: validateUrl },
  });

  useActiveUrlAutofill(setValue);

  return (
    <Form
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <ReadingFields
        url={itemProps.url}
        thoughts={itemProps.thoughts}
        rating={itemProps.rating}
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
