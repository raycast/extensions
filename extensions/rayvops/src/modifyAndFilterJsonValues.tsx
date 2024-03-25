import { Form, ActionPanel, Action, showToast, ToastStyle, Clipboard } from "@raycast/api";
import React, { useState, useEffect } from "react";

interface Modification {
  id: number;
  field: string;
  newValue: string;
}

export default function ModifyAndFilterJsonValues() {
  const [originalJson, setOriginalJson] = useState<any[]>([]);
  const [fields, setFields] = useState<string[]>([]);
  const [modifications, setModifications] = useState<Modification[]>([]);
  const [checkedFields, setCheckedFields] = useState<{ [key: string]: boolean }>({});
  const [selectAll, setSelectAll] = useState<boolean>(true);
  const [modificationId, setModificationId] = useState<number>(0);

  useEffect(() => {
    Clipboard.readText().then((text) => {
      if (text) {
        try {
          const json = JSON.parse(text);
          setOriginalJson(json);
          const initialFields = Object.keys(json[0] || {});
          setFields(initialFields);
          const allChecked = initialFields.reduce((acc: { [key: string]: boolean }, field) => {
            acc[field] = true;
            return acc;
          }, {});
          setCheckedFields(allChecked);
        } catch (error) {
          showToast(ToastStyle.Failure, "Error", "Clipboard content is not valid JSON.");
        }
      }
    });
  }, []);

  const handleAddFieldModification = () => {
    const newId = modificationId + 1;
    setModifications([...modifications, { id: newId, field: "", newValue: "" }]);
    setModificationId(newId);
  };

  const handleApplyChanges = () => {
    const modifiedJson = originalJson.map(obj => {
      const filteredObj: Record<string, any> = Object.keys(obj)
        .filter(key => checkedFields[key])
        .reduce((acc: Record<string, any>, key) => {
          acc[key] = obj[key];
          return acc;
        }, {});

      modifications.forEach(({ field, newValue }) => {
        if (field in filteredObj) {
          filteredObj[field] = newValue;
        }
      });

      return filteredObj;
    });

    Clipboard.copy(JSON.stringify(modifiedJson, null, 2)).then(() =>
      showToast(ToastStyle.Success, "Modifications Applied", "Modified JSON has been copied to clipboard.")
    );
  };

  const handleSelectAllChange = (newValue: boolean) => {
    setSelectAll(newValue);
    const newCheckedFields = { ...checkedFields };
    fields.forEach(field => {
      newCheckedFields[field] = newValue;
    });
    setCheckedFields(newCheckedFields);
  };

  return (
    <Form
      actions={
        <ActionPanel>
          <Action title="Add Field Modification" onAction={handleAddFieldModification} />
          <Action title="Apply Changes" onAction={handleApplyChanges} />
        </ActionPanel>
      }>
      {modifications.map((modification, index) => (
        <React.Fragment key={modification.id}>
          <Form.Dropdown
            id={`field-${modification.id}`}
            title={`Field to Modify #${index + 1}`}
            value={modification.field}
            onChange={(field) => {
              const newMods = modifications.map(mod => mod.id === modification.id ? { ...mod, field } : mod);
              setModifications(newMods);
              setCheckedFields({ ...checkedFields, [field]: true });
            }}>
            {fields.map(field => (
              <Form.Dropdown.Item key={field} title={field} value={field} />
            ))}
          </Form.Dropdown>
          <Form.TextField
            id={`newValue-${modification.id}`}
            title={`New Value for Field #${index + 1}`}
            value={modification.newValue}
            onChange={(newValue) => {
              const newMods = modifications.map(mod => mod.id === modification.id ? { ...mod, newValue } : mod);
              setModifications(newMods);
            }}
          />
        </React.Fragment>
      ))}
      <Form.Checkbox
        id="select-all"
        label="Select All / Deselect All"
        value={selectAll}
        onChange={handleSelectAllChange}
      />
      {fields.map(field => (
        <Form.Checkbox
          key={field}
          id={`check-${field}`}
          label={field}
          value={!!checkedFields[field]}
          onChange={(newValue) => {
            if (!modifications.some(mod => mod.field === field) || newValue) {
              setCheckedFields({ ...checkedFields, [field]: newValue });
            }
          }}
        />
      ))}
    </Form>
  );
}
