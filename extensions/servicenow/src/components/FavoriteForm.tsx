import { ActionPanel, Action, Form, Icon, useNavigation, Keyboard, confirmAlert, Alert } from "@raycast/api";
import { FormValidation, useForm } from "@raycast/utils";
import { Favorite, FavoriteRecord } from "../types";
import useFavorites from "../hooks/useFavorites";

type SetInstanceFormProps = {
  favorite?: Favorite;
  favoriteId?: string;
  add?: "group" | "favorite";
  groupId?: string;
  revalidate?: () => void;
};

const findFavoriteById = (data: Favorite[], targetId: string): Favorite | undefined =>
  data?.reduce(
    (result, item) =>
      result || (item.id === targetId ? item : item.favorites ? findFavoriteById(item.favorites, targetId) : undefined),
    undefined as Favorite | undefined,
  );

export default function FavoriteForm({ favorite, favoriteId, add, groupId, revalidate }: SetInstanceFormProps) {
  const { pop } = useNavigation();
  const {
    addUrlToFavorites,
    updateFavorite,
    updateFavoritesGroup,
    addFavoritesGroup,
    removeFromFavorites,
    favoritesGroups,
    favorites,
  } = useFavorites();

  if (favoriteId) {
    favorite = findFavoriteById(favorites || [], favoriteId);
  }

  const isGroup = favorite?.group || add == "group";

  const { itemProps, handleSubmit } = useForm<FavoriteRecord>({
    onSubmit(values) {
      // We are updating
      if (favorite) {
        isGroup
          ? updateFavoritesGroup({ ...values, sys_id: favorite.id }, revalidate)
          : updateFavorite({ ...values, sys_id: favorite.id || "" }, revalidate);
      } else {
        isGroup
          ? addFavoritesGroup(values.title, revalidate)
          : addUrlToFavorites(values.title, values.url || "", values.group, revalidate);
      }

      pop();
    },
    initialValues: {
      title: favorite?.title,
      url: decodeURIComponent(favorite?.url || ""),
      group: favorite?.groupId || groupId,
    },
    validation: {
      title: FormValidation.Required,
      url: isGroup ? undefined : FormValidation.Required,
    },
  });

  return (
    <Form
      navigationTitle={"Manage Favorites - Edit"}
      isLoading={false}
      actions={
        <ActionPanel>
          <ActionPanel.Section title={favorite?.title}>
            <Action.SubmitForm onSubmit={handleSubmit} icon={Icon.SaveDocument} title={"Save"} />
            <Action
              title="Delete"
              icon={Icon.Trash}
              style={Action.Style.Destructive}
              onAction={() =>
                confirmAlert({
                  title: "Delete Favorite",
                  message: `Are you sure you want to delete "${favorite?.title}"?`,
                  primaryAction: {
                    style: Alert.ActionStyle.Destructive,
                    title: "Delete",
                    onAction: () => {
                      removeFromFavorites(favorite?.id || "", favorite?.title || "", false, revalidate);
                      pop();
                    },
                  },
                })
              }
              shortcut={Keyboard.Shortcut.Common.Remove}
            />
          </ActionPanel.Section>
        </ActionPanel>
      }
    >
      <Form.TextField {...itemProps.title} title="Name" placeholder="Enter the favorite name" />
      {!isGroup && (
        <>
          <Form.TextArea {...itemProps.url} title="URL" placeholder="Enter the favorite URL" />
          <Form.Dropdown {...itemProps.group} title="Favorites Group">
            <Form.Dropdown.Item value="" title="--None--" />
            {favoritesGroups?.map((favoritesGroup) => (
              <Form.Dropdown.Item key={favoritesGroup.id} value={favoritesGroup.id} title={favoritesGroup.title} />
            ))}
          </Form.Dropdown>
        </>
      )}
    </Form>
  );
}
