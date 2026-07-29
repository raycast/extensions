import { Action, ActionPanel, Form, showToast, Toast, useNavigation } from "@raycast/api";
import { useState } from "react";
import { Variant } from "../types";
import { useVariantContext } from "../storage/useVariantContext";

export const EditVariantForm = ({ variant }: { variant: Variant }) => {
  const { variants, saveVariants } = useVariantContext();

  const { pop } = useNavigation();
  const [name, setName] = useState(variant.name);
  const [links, setLinks] = useState(variant.links.join(", "));

  const handleSubmit = async () => {
    const linksArray = links
      .split(",")
      .filter((link) => link.trim() !== "")
      .map((link) => link.trim());
    setLinks(linksArray.join(", "));

    const updatedVariants = variants.map((variantItem) =>
      variant.id === variantItem.id ? { ...variantItem, name, links: linksArray } : variantItem,
    );
    await saveVariants(updatedVariants);
    showToast(Toast.Style.Success, "Variant updated!");
    pop();
  };

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Update Variant" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField id="name" title="Variant Name" value={name} onChange={setName} />
      <Form.TextArea id="links" title="Links (comma-separated)" value={links} onChange={setLinks} />
    </Form>
  );
};
