import { ActionPanel, Form, Action, Color, Icon, LocalStorage, showToast, Toast, useNavigation } from "@raycast/api";
import { useEffect, useState } from "react";

export default function BookmarkTagColorForm(props: { tagName: string }) {
  const { pop } = useNavigation();
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [tagColor, setTagColor] = useState<string>("");

  useEffect(() => {
    const fetchTagColor = async () => {
      const tagColorLocalStorage = await LocalStorage.getItem("bookmarkTagColor");
      const tagColorObject = tagColorLocalStorage ? JSON.parse(tagColorLocalStorage as string) : {};
      setTagColor(tagColorObject[props.tagName] || "Default");
      setIsLoading(false);
    };
    fetchTagColor();
  }, []);

  const saveTagColor = async (tagColor: string) => {
    try {
      const tagColorLocalStorage = await LocalStorage.getItem("bookmarkTagColor");
      const tagColorObject = tagColorLocalStorage ? JSON.parse(tagColorLocalStorage as string) : {};
      tagColorObject[props.tagName] = tagColor;
      await LocalStorage.setItem("bookmarkTagColor", JSON.stringify(tagColorObject));
      await showToast({
        style: Toast.Style.Success,
        title: "Successfully saved tag color",
      });
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to save tag color",
        message: error instanceof Error ? error.message : undefined,
      });
    }
    pop();
  };

  if (isLoading || !tagColor) {
    return <Form isLoading />;
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Save Tag Color" onSubmit={(values) => saveTagColor(values.tagColor)} />
        </ActionPanel>
      }
    >
      <Form.Dropdown id="tagColor" title="Tag Color" value={tagColor} onChange={setTagColor}>
        <Form.Dropdown.Item value="Default" title="Default Color" />
        <Form.Dropdown.Item value="Green" title="Green" icon={{ source: Icon.CircleFilled, tintColor: Color.Green }} />
        <Form.Dropdown.Item
          value="Magenta"
          title="Magenta"
          icon={{ source: Icon.CircleFilled, tintColor: Color.Magenta }}
        />
        <Form.Dropdown.Item
          value="Orange"
          title="Orange"
          icon={{ source: Icon.CircleFilled, tintColor: Color.Orange }}
        />
        <Form.Dropdown.Item
          value="Purple"
          title="Purple"
          icon={{ source: Icon.CircleFilled, tintColor: Color.Purple }}
        />
        <Form.Dropdown.Item value="Red" title="Red" icon={{ source: Icon.CircleFilled, tintColor: Color.Red }} />
        <Form.Dropdown.Item
          value="Yellow"
          title="Yellow"
          icon={{ source: Icon.CircleFilled, tintColor: Color.Yellow }}
        />
        <Form.Dropdown.Item
          value="PrimaryText"
          title="PrimaryText"
          icon={{ source: Icon.CircleFilled, tintColor: Color.PrimaryText }}
        />
        <Form.Dropdown.Item
          value="SecondaryText"
          title="SecondaryText"
          icon={{ source: Icon.CircleFilled, tintColor: Color.SecondaryText }}
        />
      </Form.Dropdown>
    </Form>
  );
}
