import { Action, ActionPanel, Form, PopToRootType, closeMainWindow } from "@raycast/api";
import { nanoid } from "nanoid";
import { useEffect, useState } from "react";
import { useFavorites } from "./hooks/useFavorites";
import { Favorite } from "./types/favorite";
import { Controller, useForm } from "react-hook-form";

function toTitleCase(str: string) {
  return str.replace(/\w\S*/g, (txt) => txt.charAt(0).toUpperCase() + txt.substring(1).toLowerCase());
}

function formatFavoriteTitle(title: string) {
  return toTitleCase(title.replace(/[-|_]/g, " ").split("/").pop() || "");
}

export default function Command() {
  const { control, formState, handleSubmit } = useForm<Favorite>();
  const { favorites, add } = useFavorites();

  const [path, setPath] = useState<string>("");
  const [favoriteName, setFavoriteName] = useState<string>("");

  const [favoriteNameError, setFavoriteNameError] = useState<string>();
  const [favoritePathError, setFavoritePathError] = useState<string>();

  useEffect(() => {
    setFavoriteName(formatFavoriteTitle(path || ""));
  }, [path]);

  useEffect(() => {
    validateFields();
  }, [favoriteName, path]);

  async function addFavorite(favorite: Favorite) {
    const isValid = validateFields();

    if (!isValid) return;

    favorite.id ||= nanoid();

    add(favorite);

    closeMainWindow({
      clearRootSearch: true,
      popToRootType: PopToRootType.Immediate,
    });
  }

  const validateFields = () => {
    if (favoriteName?.trim() === "") {
      setFavoriteNameError("Favorite name is required");
      return false;
    } else {
      setFavoriteNameError(undefined);
    }

    if (path?.trim() === "") {
      setFavoritePathError("Favorite path is required");
      return false;
    } else {
      setFavoritePathError(undefined);
    }

    return true;
  };

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm onSubmit={addFavorite} />
        </ActionPanel>
      }
    >
      <Form.FilePicker
        key={"path"}
        id={"path"}
        title="Project folder"
        value={path ? [path] : undefined}
        canChooseFiles={false}
        canChooseDirectories={true}
        onChange={(paths) => setPath(paths[0])}
        allowMultipleSelection={false}
        error={formState.errors.path?.message}
      />
      <Form.TextField
        error={formState.errors.name?.message}
        key={"name"}
        id={"name"}
        title="Project name"
        value={favoriteName}
        onChange={(value) => setFavoriteName(value)}
      />
    </Form>
  );
}
