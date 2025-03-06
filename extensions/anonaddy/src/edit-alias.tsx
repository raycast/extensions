import { useState, useEffect } from "react";

import { Action, ActionPanel, Form, Icon, showHUD, popToRoot } from "@raycast/api";

import * as alias from "./api/alias";
import type { Alias } from "./api/alias";

const EditAlias = () => {
  const [aliases, setAliases] = useState<Alias[]>([]);

  const [selectedAlias, setSelectedAlias] = useState<Alias | null>(null);

  const [newDesc, setNewDesc] = useState("");

  useEffect(() => {
    init();
  }, []);

  const init = async () => {
    const allAliases = await alias.get();

    setAliases(allAliases);
    setSelectedAlias(allAliases[0]);
  };

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Edit Alias"
            onSubmit={async (values) => {
              const success = await alias.edit(values.email, { description: values.desc });

              if (success) {
                showHUD("✅ Alias edited");
                popToRoot({ clearSearchBar: true });
              } else {
                showHUD("❌ Error editing alias");
              }
            }}
          />
        </ActionPanel>
      }
    >
      <Form.Dropdown
        id="email"
        title="Alias Email"
        value={selectedAlias?.id}
        onChange={(newValue: string) => {
          const selectedAlias = aliases.find((alias) => alias.id === newValue)!;

          setSelectedAlias(selectedAlias);
          setNewDesc(selectedAlias.description || "");
        }}
        autoFocus
      >
        {aliases.map((alias) => (
          <Form.Dropdown.Item value={alias.id} key={alias.id} icon={Icon.Envelope} title={alias.email} />
        ))}
      </Form.Dropdown>
      <Form.TextField id="desc" title="Description" value={newDesc} onChange={setNewDesc} placeholder="Newsletters" />
    </Form>
  );
};

export default EditAlias;
