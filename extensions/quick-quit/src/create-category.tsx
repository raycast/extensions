import {
  ActionPanel,
  Action,
  Form,
  LocalStorage,
  getApplications,
  showToast,
  useNavigation,
  Toast,
  Application,
  Icon,
} from "@raycast/api";
import { useEffect, useState, useRef } from "react";
import { randomUUID } from "crypto";
import { Category } from "./types";

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
  const [isLoading, setIsLoading] = useState(true);
  const hasInitialized = useRef(false);

  const [apps, setApps] = useState<Application[]>([]);
  const [categoryName, setCategoryName] = useState<string>("");
  const [selectedBundleIds, setSelectedBundleIds] = useState<string[]>([]);
  const [selectedIcon, setSelectedIcon] = useState<string>("🧑‍💻");

  // Track the initial bundle IDs to prevent them from being cleared by Form.TagPicker
  const initialBundleIds = useRef<string[]>([]);

  // Effect 1: Fetch all installed applications once on mount
  useEffect(() => {
    async function fetchApps() {
      try {
        const installedApps = await getApplications();
        setApps(installedApps);
      } catch (error) {
        await showToast({
          style: Toast.Style.Failure,
          title: "Failed to load applications",
          message: error instanceof Error ? error.message : "An unknown error occurred",
        });
        setIsLoading(false); // Stop loading on error
      }
    }
    fetchApps();
  }, []); // Runs only once

  // Effect 2: Load category details, but only after apps have been loaded and if editing
  useEffect(() => {
    // Don't run this effect until the apps are loaded
    if (apps.length === 0 && categoryId) {
      return;
    }

    // If we are creating a new category, we can stop loading and exit.
    if (!categoryId) {
      setIsLoading(false);
      hasInitialized.current = true;
      return;
    }

    async function fetchCategoryDetails() {
      try {
        const storedCategoriesRaw = await LocalStorage.getItem<string>("categories");
        if (storedCategoriesRaw) {
          const categories: Category[] = JSON.parse(storedCategoriesRaw);
          const foundCategory = categories.find((cat) => cat.id === categoryId);

          if (foundCategory) {
            const installedBundleIdsSet = new Set(apps.map((app) => app.bundleId));
            const validBundleIds = foundCategory.bundleIds.filter((id) => id && installedBundleIdsSet.has(id));

            setCategoryName(foundCategory.name);
            setSelectedBundleIds(validBundleIds);
            initialBundleIds.current = validBundleIds;
            setSelectedIcon(foundCategory.icon);
            hasInitialized.current = true;
          }
        }
      } catch (error) {
        await showToast({
          style: Toast.Style.Failure,
          title: "Failed to load category details",
          message: error instanceof Error ? error.message : "An unknown error occurred",
        });
      } finally {
        setIsLoading(false); // Done loading
      }
    }

    fetchCategoryDetails();
  }, [categoryId, apps]); // This effect now correctly depends on `apps`

  async function handleSubmit() {
    if (!categoryName) {
      await showToast({ style: Toast.Style.Failure, title: "Category name is required" });
      return;
    }
    if (selectedBundleIds.length === 0) {
      await showToast({ style: Toast.Style.Failure, title: "Please select at least one application" });
      return;
    }

    const toast = await showToast({ style: Toast.Style.Animated, title: categoryId ? "Saving..." : "Creating..." });

    try {
      const storedCategories = await LocalStorage.getItem<string>("categories");
      const categories: Category[] = storedCategories ? JSON.parse(storedCategories) : [];

      if (categoryId) {
        const categoryIndex = categories.findIndex((cat) => cat.id === categoryId);
        if (categoryIndex !== -1) {
          categories[categoryIndex] = {
            ...categories[categoryIndex],
            name: categoryName,
            icon: selectedIcon,
            bundleIds: selectedBundleIds,
          };
        }
      } else {
        const newCategory: Category = {
          id: randomUUID(),
          name: categoryName,
          bundleIds: selectedBundleIds,
          icon: selectedIcon,
        };
        categories.push(newCategory);
      }

      await LocalStorage.setItem("categories", JSON.stringify(categories));
      toast.style = Toast.Style.Success;
      toast.title = categoryId ? "Category Updated" : "Category Created";
      onCategoryUpdated();
      pop();
    } catch (error) {
      toast.style = Toast.Style.Failure;
      toast.title = "Failed to save category";
      toast.message = error instanceof Error ? error.message : "An unknown error occurred";
    }
  }

  // Effect to prevent selectedBundleIds from being cleared by Form.TagPicker after initialization
  useEffect(() => {
    if (hasInitialized.current && initialBundleIds.current.length > 0 && selectedBundleIds.length === 0) {
      setSelectedBundleIds(initialBundleIds.current);
    }
  }, [selectedBundleIds]);

  return (
    <Form
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title={categoryId ? "Save Changes" : "Create Category"}
            onSubmit={handleSubmit}
            icon={Icon.CheckCircle}
          />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="name"
        title="Category Name"
        placeholder="e.g., Work Apps"
        value={categoryName}
        onChange={setCategoryName}
      />
      <Form.Dropdown id="icon" title="Icon" value={selectedIcon} onChange={setSelectedIcon}>
        {Object.entries(EMOJI_ICONS).map(([emoji, name]) => (
          <Form.Dropdown.Item key={emoji} value={emoji} title={`${emoji} ${name}`} />
        ))}
      </Form.Dropdown>
      <Form.TagPicker
        id="apps"
        title="Applications"
        placeholder="Type to search for applications"
        value={selectedBundleIds}
        onChange={setSelectedBundleIds}
      >
        {apps
          .filter((app) => !!app.bundleId)
          .map((app) => (
            <Form.TagPicker.Item key={app.bundleId!} value={app.bundleId!} title={app.name} />
          ))}
      </Form.TagPicker>
    </Form>
  );
}

export default function CreateCategoryCommand() {
  return <CreateCategoryForm onCategoryUpdated={() => {}} />;
}
