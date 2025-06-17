import {
  ActionPanel,
  Action,
  Form,
  LocalStorage,
  getApplications,
  showToast,
  useNavigation,
  Toast,
} from "@raycast/api";
import { useEffect, useState } from "react";
import { randomUUID } from "crypto";
import { Category } from "./types";

// ADD THIS LIST
const EMOJI_ICONS: Record<string, string> = {
  "🧑‍💻": "Developer",
  "🚀": "Rocket",
  "💡": "Idea",
  "💼": "Briefcase",
  "📚": "Books",
  "🎮": "Gaming",
  "💬": "Chat",
  "📝": "Notes",
  "🎨": "Art",
  "🎵": "Music",
  "💰": "Money",
  "🔒": "Security",
  "⚙️": "Settings",
  "🤖": "Bot",
  "💻": "Laptop",
  "🖥️": "Desktop",
  "🖱️": "Mouse",
  "⌨️": "Keyboard",
  "💾": "Save",
  "💿": "Disc",
  "🔌": "Plugin",
  "🔋": "Battery",
  "📡": "Network",
  "🧠": "Brain",
  "💳": "Card",
  "💵": "Dollar",
  "📈": "Chart",
  "🏦": "Bank",
  "🛡️": "Shield",
  "🧾": "Receipt",
  "✅": "Done",
  "❌": "Remove",
  "❓": "Question",
  "❗": "Alert",
  "📌": "Pin",
  "📍": "Location",
  "⏰": "Alarm",
  "⏳": "Hourglass",
  "🏁": "Finish",
  "🏳️": "Flag",
  "✨": "Magic",
  "🌍": "Web",
};

interface CreateCategoryFormProps {
  categoryId?: string;
  onCategoryUpdated: () => void;
}

export function CreateCategoryForm({ categoryId, onCategoryUpdated }: CreateCategoryFormProps) {
  const { pop } = useNavigation();
  const [installedApps, setInstalledApps] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // These states will now control the form fields directly
  const [categoryName, setCategoryName] = useState<string>("");
  const [selectedApps, setSelectedApps] = useState<string[]>([]);
  const [selectedIcon, setSelectedIcon] = useState<string>(EMOJI_ICONS[0]); // ADD THIS LINE

  useEffect(() => {
    async function fetchInitialData() {
      try {
        // Fetch all installed applications
        const apps = await getApplications();
        const appNames = apps.map((app) => app.name).sort();
        setInstalledApps(appNames);

        // If we are editing, fetch the category and set the state
        if (categoryId) {
          const storedCategories = await LocalStorage.getItem<string>("categories");
          if (storedCategories) {
            const categories: Category[] = JSON.parse(storedCategories);
            const foundCategory = categories.find((cat) => cat.id === categoryId);
            if (foundCategory) {
              setCategoryName(foundCategory.name);
              setSelectedApps(foundCategory.apps);
              setSelectedIcon(foundCategory.icon); // ADD THIS LINE
            }
          }
        }
      } catch (error) {
        await showToast({
          style: Toast.Style.Failure,
          title: "Failed to load data",
          message: error instanceof Error ? error.message : "An unknown error occurred",
        });
      } finally {
        setIsLoading(false);
      }
    }
    fetchInitialData();
  }, [categoryId]);

  async function handleSubmit() {
    if (!categoryName) {
      await showToast({ style: Toast.Style.Failure, title: "Category name is required" });
      return;
    }
    if (!selectedApps || selectedApps.length === 0) {
      await showToast({ style: Toast.Style.Failure, title: "Please select at least one application" });
      return;
    }

    const toast = await showToast({
      style: Toast.Style.Animated,
      title: categoryId ? "Saving changes..." : "Creating category...",
    });

    try {
      const storedCategories = await LocalStorage.getItem<string>("categories");
      const categories: Category[] = storedCategories ? JSON.parse(storedCategories) : [];
      const values = { name: categoryName, apps: selectedApps, icon: selectedIcon };

      if (categoryId) {
        const categoryIndex = categories.findIndex((cat) => cat.id === categoryId);
        if (categoryIndex !== -1) {
          categories[categoryIndex] = { ...categories[categoryIndex], ...values };
        }
      } else {
        const newCategory: Category = { id: randomUUID(), name: values.name, apps: values.apps, icon: values.icon };
        categories.push(newCategory);
      }

      await LocalStorage.setItem("categories", JSON.stringify(categories));
      toast.style = Toast.Style.Success;
      toast.title = categoryId ? "Category Updated" : "Category Created";
      toast.message = values.name;
      onCategoryUpdated();
      pop();
    } catch (error) {
      toast.style = Toast.Style.Failure;
      toast.title = "Failed to save category";
      toast.message = error instanceof Error ? error.message : "An unknown error occurred";
    }
  }

  return (
    <Form
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm title={categoryId ? "Save Changes" : "Create Category"} onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="name"
        title="Category Name"
        placeholder="e.g., AI Apps"
        value={categoryName}
        onChange={setCategoryName}
      />
      <Form.Dropdown id="icon" title="Icon" value={selectedIcon} onChange={setSelectedIcon}>
        {Object.entries(EMOJI_ICONS).map(([emoji, name]: [string, string]) => (
          <Form.Dropdown.Item key={emoji} value={emoji} title={`${emoji} ${name}`} />
        ))}
      </Form.Dropdown>
      <Form.TagPicker
        id="apps"
        title="Applications"
        placeholder="Type to search for applications"
        value={selectedApps}
        onChange={setSelectedApps}
      >
        {installedApps.map((app) => (
          <Form.TagPicker.Item key={app} value={app} title={app} />
        ))}
      </Form.TagPicker>
    </Form>
  );
}

export default function CreateCategoryCommand() {
  return <CreateCategoryForm onCategoryUpdated={() => {}} />;
}
