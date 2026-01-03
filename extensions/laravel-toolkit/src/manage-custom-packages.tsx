import {
  ActionPanel,
  Action,
  List,
  Icon,
  showToast,
  Toast,
  Form,
  useNavigation,
  confirmAlert,
  Alert,
} from "@raycast/api";
import { useState, useEffect } from "react";
import {
  getCustomPackages,
  addCustomPackage,
  removeCustomPackage,
  updateCustomPackage,
  CustomPackage,
} from "./utils/custom-packages";

export default function Command() {
  const [packages, setPackages] = useState<CustomPackage[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadPackages();
  }, []);

  async function loadPackages() {
    setIsLoading(true);
    const data = await getCustomPackages();
    setPackages(data);
    setIsLoading(false);
  }

  async function handleDelete(id: string) {
    if (
      await confirmAlert({
        title: "Delete Package?",
        message: "This cannot be undone.",
        primaryAction: { title: "Delete", style: Alert.ActionStyle.Destructive },
      })
    ) {
      await removeCustomPackage(id);
      await loadPackages();
      showToast({ style: Toast.Style.Success, title: "Package Deleted" });
    }
  }

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search custom packages...">
      {packages.length === 0 && !isLoading ? (
        <List.EmptyView
          icon={Icon.Box}
          title="No Custom Packages"
          description="Add a package to use it in your projects"
          actions={
            <ActionPanel>
              <Action.Push title="Add New Package" icon={Icon.Plus} target={<PackageForm onSuccess={loadPackages} />} />
            </ActionPanel>
          }
        />
      ) : (
        packages.map((pkg) => (
          <List.Item
            key={pkg.id}
            icon={pkg.type === "composer" ? Icon.Globe : Icon.Code}
            title={pkg.title}
            subtitle={pkg.package}
            accessories={[{ text: pkg.type.toUpperCase() }]}
            actions={
              <ActionPanel>
                <ActionPanel.Section>
                  <Action.Push
                    title="Edit Package"
                    icon={Icon.Pencil}
                    target={<PackageForm pkg={pkg} onSuccess={loadPackages} />}
                  />
                  <Action
                    title="Delete Package"
                    icon={Icon.Trash}
                    style={Action.Style.Destructive}
                    onAction={() => handleDelete(pkg.id)}
                  />
                </ActionPanel.Section>
                <ActionPanel.Section>
                  <Action.Push
                    title="Add New Package"
                    icon={Icon.Plus}
                    target={<PackageForm onSuccess={loadPackages} />}
                  />
                </ActionPanel.Section>
              </ActionPanel>
            }
          />
        ))
      )}
    </List>
  );
}

function PackageForm({ pkg, onSuccess }: { pkg?: CustomPackage; onSuccess: () => void }) {
  const { pop } = useNavigation();

  async function handleSubmit(values: { title: string; package: string; type: string; description: string }) {
    if (!values.title || !values.package) {
      showToast({ style: Toast.Style.Failure, title: "Title and Package Name required" });
      return;
    }

    try {
      if (pkg) {
        await updateCustomPackage(pkg.id, {
          title: values.title,
          package: values.package,
          type: values.type as "composer" | "npm",
          description: values.description,
        });
        showToast({ style: Toast.Style.Success, title: "Package Updated" });
      } else {
        await addCustomPackage({
          title: values.title,
          package: values.package,
          type: values.type as "composer" | "npm",
          description: values.description,
        });
        showToast({ style: Toast.Style.Success, title: "Package Added" });
      }
      onSuccess();
      pop();
    } catch {
      showToast({ style: Toast.Style.Failure, title: "Failed to save package" });
    }
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title={pkg ? "Update Package" : "Add Package"} onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField id="title" title="Display Title" placeholder="e.g. My Debug Kit" defaultValue={pkg?.title} />
      <Form.TextField
        id="package"
        title="Package Name"
        placeholder="e.g. spatie/laravel-permission"
        defaultValue={pkg?.package}
      />
      <Form.Dropdown id="type" title="Type" defaultValue={pkg?.type || "composer"}>
        <Form.Dropdown.Item value="composer" title="Composer (PHP)" icon={Icon.Globe} />
        <Form.Dropdown.Item value="npm" title="Sort of NPM (Node)" icon={Icon.Code} />
      </Form.Dropdown>
      <Form.TextArea
        id="description"
        title="Description"
        placeholder="Optional description..."
        defaultValue={pkg?.description}
      />
    </Form>
  );
}
