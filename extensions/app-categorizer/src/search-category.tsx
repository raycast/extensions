import {
  Action,
  ActionPanel,
  Alert,
  confirmAlert,
  Icon,
  List,
  showToast,
  Toast,
  useNavigation,
} from "@raycast/api";
import { useEffect, useState } from "react";
import { getCategories, deleteCategory, CategoryMap } from "./utils/storage";
import EditCategory from "./edit-category";

export default function SearchCategory() {
  const [categories, setCategories] = useState<CategoryMap>({});
  const [isLoading, setIsLoading] = useState(true);
  const { push } = useNavigation();

  async function loadCategories() {
    setIsLoading(true);
    const data = await getCategories();
    setCategories(data);
    setIsLoading(false);
  }

  useEffect(() => {
    loadCategories();
  }, []);

  async function handleDelete(name: string) {
    const confirmed = await confirmAlert({
      title: `Excluir categoria "${name}"?`,
      message: "Essa ação não pode ser desfeita.",
      primaryAction: { title: "Excluir", style: Alert.ActionStyle.Destructive },
    });
    if (confirmed) {
      await deleteCategory(name);
      showToast({ style: Toast.Style.Success, title: "Categoria excluída" });
      loadCategories();
    }
  }

  const names = Object.keys(categories);

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Buscar categoria...">
      {names.length === 0 && !isLoading ? (
        <List.EmptyView
          icon={Icon.Folder}
          title="Nenhuma categoria criada"
          description="Use o comando 'Criar Categoria' para começar"
        />
      ) : (
        names.map((name) => (
          <List.Item
            key={name}
            title={name}
            subtitle={`${categories[name].length} app(s)`}
            icon={Icon.Folder}
            actions={
              <ActionPanel>
                <Action
                  title="Editar Categoria"
                  icon={Icon.Pencil}
                  onAction={() =>
                    push(
                      <EditCategory
                        categoryName={name}
                        apps={categories[name]}
                        onSaved={loadCategories}
                      />,
                    )
                  }
                />
                <Action
                  title="Excluir Categoria"
                  icon={Icon.Trash}
                  style={Action.Style.Destructive}
                  shortcut={{ modifiers: ["ctrl"], key: "x" }}
                  onAction={() => handleDelete(name)}
                />
              </ActionPanel>
            }
          />
        ))
      )}
    </List>
  );
}
