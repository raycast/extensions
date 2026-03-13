import { JsonFragment } from 'ethers';
import {
  ActionPanel,
  Form,
  showToast,
  Action,
  Clipboard,
  Toast,
} from '@raycast/api';
import { Coder, ValueMap } from 'abi-coder';
import { useMemo, useState } from 'react';

import { isAbi } from './utils';

interface Values {
  abi: string;
  [key: string]: string;
}

export default function Command() {
  const [abiString, setAbiString] = useState<string>('');
  const [selectedItemIndex, setSelectedItemIndex] = useState<string>('0');
  const [items, setItems] = useState<JsonFragment[]>([]);

  const selectedItem = useMemo(() => {
    const selectedIndex = parseInt(selectedItemIndex);
    return items.length > selectedIndex ? items[selectedIndex] : null;
  }, [selectedItemIndex, items]);

  function handleAbiStringUpdate(value: string) {
    setAbiString(value);
    setSelectedItemIndex('0');
    setItems([]);
    try {
      const items = JSON.parse(value);
      setItems(items);
    } catch {
      console.error('Failed to parse ABI string');
    }
  }

  function getItemTitle(item: JsonFragment) {
    return item.name ? `${item.type} "${item.name}"` : item.type || '';
  }

  function getItemForm(item: JsonFragment) {
    if (!item.inputs) return [];
    return item.inputs.map((input, index) => (
      <Form.TextField id={index.toString()} title={input.name} />
    ));
  }

  function handleSubmit(formValues: Values) {
    const abiString = formValues.abi;
    if (!isAbi(abiString)) {
      showToast({
        style: Toast.Style.Failure,
        title: 'Invalid ABI',
      });
      return;
    }
    const abi = JSON.parse(abiString);
    const coder = new Coder(abi);
    const data = encode(coder, selectedItem, formValues);
    if (!data) {
      showToast({
        style: Toast.Style.Failure,
        title: 'Convertion failed',
      });
      return;
    }
    Clipboard.copy(data);
    showToast({
      style: Toast.Style.Success,
      title: 'Copied to clipboard',
    });
  }

  function encode(
    coder: Coder,
    selectedItem: JsonFragment | null,
    formValues: Values,
  ): string | null {
    if (!selectedItem) {
      return null;
    }
    const name = selectedItem.name;
    const inputs = selectedItem.inputs;
    if (!inputs) {
      return null;
    }
    const values = Object.fromEntries(
      inputs.map((_, index) => [
        inputs[index].name,
        formValues[index.toString()],
      ]),
    ) as ValueMap;
    try {
      const type = selectedItem.type;
      if (!type) {
        return null;
      }
      if (type === 'constructor') {
        return coder.encodeConstructor(values);
      }
      if (!name) {
        return null;
      }
      if (type === 'function') {
        return coder.encodeFunction(name, values);
      }
      if (type === 'event') {
        return coder.encodeEvent(name, values).data;
      }
      return null;
    } catch {
      return null;
    }
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextArea
        id="abi"
        title="ABI"
        value={abiString}
        onChange={handleAbiStringUpdate}
      />
      {items.length > 0 && (
        <Form.Dropdown
          id="items"
          title="Item"
          value={selectedItemIndex}
          onChange={setSelectedItemIndex}
        >
          {items.map((item, index) => (
            <Form.Dropdown.Item
              title={getItemTitle(item)}
              value={index.toString()}
            />
          ))}
        </Form.Dropdown>
      )}
      {selectedItem && (
        <>
          <Form.Separator />
          {getItemForm(selectedItem)}
        </>
      )}
    </Form>
  );
}
