import { AliasForm } from "./components/forms/AliasForm";
import { addBetterAlias } from "./lib/betterAliases";

export default function Command() {
  return (
    <AliasForm
      mode="create"
      submitTitle="Create"
      onSubmit={async (values) => {
        addBetterAlias(values.alias, {
          value: values.value,
          label: values.label || values.alias,
          snippetOnly: values.snippetOnly,
        });
      }}
    />
  );
}
