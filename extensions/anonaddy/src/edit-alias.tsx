import { Action, ActionPanel, Form, Icon, showHUD, popToRoot } from "@raycast/api";
import { aliasObject, listAllAliases } from "./utils/list";
import { useState, useEffect } from "react";
import { editAlias } from "./utils/edit";

const EditAlias = () => {
  const [aliases, setAliases] = useState<aliasObject[]>([]);

  const [selectedAlias, setSelectedAlias] = useState<aliasObject | null>(null);

  const [newDesc, setNewDesc] = useState("");

  useEffect(() => {
    init();
  }, []);

  const init = async () => {
    const allAliases = await listAllAliases();

    setAliases(allAliases);
    setSelectedAlias(allAliases[0]);
  };

  return (
    <>
      <Form
        actions={
          <ActionPanel>
            <Action.SubmitForm
              title="Edit Alias"
              onSubmit={async (values) => {
                const success = await editAlias(values.email, values.desc);

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
    </>
  );
};

export default EditAlias;
