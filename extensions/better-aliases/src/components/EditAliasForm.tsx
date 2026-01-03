import { addBetterAlias, deleteBetterAlias, updateBetterAlias } from "../lib/betterAliases";
import type { BetterAliasItem } from "../types";
import { AliasForm } from "./forms/AliasForm";

interface EditAliasFormProps {
  alias: string;
  item: BetterAliasItem;
}

export function EditAliasForm({ alias, item }: EditAliasFormProps) {
  return (
    <AliasForm
      mode="edit"
      initialValues={{
        alias,
        value: item.value,
        label: item.label,
        snippetOnly: item.snippetOnly || false,
      }}
      submitTitle="Save"
      onSubmit={async (values) => {
        if (values.alias !== alias) {
          deleteBetterAlias(alias);
          addBetterAlias(values.alias, {
            value: values.value,
            label: values.label || values.alias,
            snippetOnly: values.snippetOnly,
          });
        } else {
          updateBetterAlias(alias, {
            value: values.value,
            label: values.label || alias,
            snippetOnly: values.snippetOnly,
          });
        }
      }}
    />
  );
}
