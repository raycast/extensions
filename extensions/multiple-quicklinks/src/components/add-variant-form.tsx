import { Action, ActionPanel, Form, showToast, Toast, useNavigation } from "@raycast/api";
import { useState } from "react";
import { Variant } from "../types";
import { useVariantContext } from "../storage/useVariantContext";

export const AddVariantForm = () => {
  const { variants, saveVariants } = useVariantContext();

  const { pop } = useNavigation();
  const [name, setName] = useState("");
  const [links, setLinks] = useState("");

  const handleSubmit = async () => {
    const linksArray = links
      .split(",")
      .filter((link) => link.trim() !== "")
      .map((link) => link.trim());
    setLinks(linksArray.join(", "));

    const newVariant: Variant = { id: Date.now().toString(), name, links: linksArray };
    const updatedVariants = [...variants, newVariant];
    await saveVariants(updatedVariants);
    showToast(Toast.Style.Success, "Variant added!");
    pop();
  };

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Save Variant" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField id="name" title="Variant Name" value={name} onChange={setName} />
      <Form.TextArea id="links" title="Links (comma-separated)" value={links} onChange={() => setLinks(links)} />
    </Form>
  );
};
