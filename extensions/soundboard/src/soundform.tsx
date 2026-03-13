import { Form, ActionPanel, Action, Icon, useNavigation } from "@raycast/api";
import { Item } from "./types";
import { useForm, FormValidation } from "@raycast/utils";
import { nanoid } from "nanoid";
import { useEffect, useState } from "react";

interface SignUpFormValues {
  id: string;
  title: string;
  path: string[];
  favourite: string;
  last_favourite: string;
}

export function SoundForm(props: { item?: Item; items?: Item[]; onEdit: (item: Item) => void }) {
  const { pop } = useNavigation();
  const [favoriteInUse, setFavoriteInUse] = useState<string>("");
  const { handleSubmit, itemProps, values } = useForm<SignUpFormValues>({
    async onSubmit(values) {
      props.onEdit(
        props?.item
          ? { ...values, id: props.item.id, last_favourite: props.item.favourite }
          : { ...values, id: nanoid() }
      );
      pop();
    },
    validation: {
      title: FormValidation.Required,
      path: FormValidation.Required,
    },
    initialValues: {
      title: props.item?.title,
      path: props.item?.path,
      favourite: props.item?.favourite,
    },
  });

  useEffect(() => {
    if (values.favourite !== "0") {
      // Map items to array of favourites
      const favourites = props.items?.map((item) => item.favourite);

      // Check if values.favorite is in favourites array
      if (favourites?.includes(values.favourite) && values.favourite !== props.item?.favourite) {
        // Find the item with the same favourite
        const item = props.items?.find((item) => item.favourite === values.favourite);
        setFavoriteInUse(
          `Favorite #${values.favourite} is already assigned - if you continue, it will be removed from "${item?.title}" `
        );
      } else {
        setFavoriteInUse("");
      }
    } else {
      setFavoriteInUse("");
    }
  }, [values.favourite]);

  const favouriteItems = Array.from(Array(10).keys()).map((i) => {
    return { title: `Favourite #${i + 1}`, value: `${i + 1}` };
  });

  favouriteItems.unshift({ title: "None", value: "0" });

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm onSubmit={handleSubmit} icon={Icon.SaveDocument} />
        </ActionPanel>
      }
    >
      <Form.TextField title="Title" placeholder="Enter Title" {...itemProps.title} />
      <Form.FilePicker allowMultipleSelection={false} info="Select an audio file" {...itemProps.path} />
      <Form.Separator />
      <Form.Description text="If you want to bind the sound to a hotkey you can then bind it to a favourite and give it a hotkey" />
      <Form.Dropdown title="Favorite" {...itemProps.favourite}>
        {favouriteItems.map((item) => (
          <Form.Dropdown.Item key={item.value} title={item.title} value={`${item.value}`} />
        ))}
      </Form.Dropdown>
      {favoriteInUse && <Form.Description title="Already Assigned!" text={favoriteInUse} />}
    </Form>
  );
}
