import { Action, ActionPanel, Form, showToast, useNavigation, Icon } from "@raycast/api";
import { useState } from "react";
import { SavedAddress, saveAddress, updateSavedAddress } from "../utils/storage";
import { Explorer } from "../interfaces";

interface SaveAddressFormProps {
  address: string;
  chainId: number;
  chainName: string;
  allExplorers?: Explorer[];
  existingEntry?: SavedAddress;
  onSaved?: () => void;
}

export default function SaveAddressForm({
  address,
  chainId,
  chainName,
  allExplorers,
  existingEntry,
  onSaved,
}: SaveAddressFormProps) {
  const { pop } = useNavigation();
  const [label, setLabel] = useState(existingEntry?.label || "");
  const [tags, setTags] = useState(existingEntry?.tags.join(", ") || "");
  const [notes, setNotes] = useState(existingEntry?.notes || "");
  const [selectedChains, setSelectedChains] = useState<string[]>(
    existingEntry?.chains.map(String) || [chainId.toString()],
  );

  // Get unique chains, sorted by name
  const availableChains =
    allExplorers
      ?.filter((e, index, self) => self.findIndex((exp) => exp.chainId === e.chainId) === index)
      .sort((a, b) => a.chainName.localeCompare(b.chainName)) || [];

  const handleSubmit = async () => {
    if (!label.trim()) {
      showToast({ title: "Error", message: "Label is required" });
      return;
    }

    const tagArray = tags
      .split(",")
      .map((t) => t.trim())
      .filter((t) => t.length > 0);
    const chainIds = selectedChains.map((c) => parseInt(c, 10));

    if (existingEntry) {
      // Update existing
      await updateSavedAddress(existingEntry.id, {
        label: label.trim(),
        tags: tagArray,
        chains: chainIds,
        notes: notes.trim() || undefined,
      });
      showToast({ title: "Updated", message: `Updated "${label}"` });
    } else {
      // Create new
      const newAddress: SavedAddress = {
        id: `addr-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
        address,
        label: label.trim(),
        tags: tagArray,
        chains: chainIds,
        notes: notes.trim() || undefined,
        createdAt: Date.now(),
        lastUsed: Date.now(),
      };
      await saveAddress(newAddress);
      showToast({ title: "Saved", message: `Saved "${label}" to address book` });
    }

    if (onSaved) onSaved();
    pop();
  };

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title={existingEntry ? "Update Address" : "Save Address"} onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="address"
        title="Address"
        value={address}
        onChange={() => {
          /* read-only */
        }}
      />
      <Form.TextField
        id="label"
        title="Label"
        placeholder="e.g., Vitalik, Uniswap V3, My Cold Wallet"
        value={label}
        onChange={setLabel}
      />
      <Form.TextField
        id="tags"
        title="Tags"
        placeholder="e.g., DeFi, Personal, Watching (comma-separated)"
        value={tags}
        onChange={setTags}
      />
      <Form.TagPicker id="chains" title="Associate with Chains" value={selectedChains} onChange={setSelectedChains}>
        {availableChains.length > 0 ? (
          <>
            {/* Separate mainnets and testnets */}
            {availableChains
              .filter((e) => !e.testNet)
              .map((explorer) => (
                <Form.TagPicker.Item
                  key={explorer.chainId}
                  value={explorer.chainId.toString()}
                  title={explorer.chainName}
                  icon={{ source: explorer.iconUri }}
                />
              ))}
            {availableChains.filter((e) => e.testNet).length > 0 && (
              <>
                {availableChains
                  .filter((e) => e.testNet)
                  .map((explorer) => (
                    <Form.TagPicker.Item
                      key={explorer.chainId}
                      value={explorer.chainId.toString()}
                      title={`${explorer.chainName} (Testnet)`}
                      icon={{ source: explorer.iconUri }}
                    />
                  ))}
              </>
            )}
          </>
        ) : (
          <Form.TagPicker.Item value={chainId.toString()} title={chainName} icon={Icon.Link} />
        )}
      </Form.TagPicker>
      <Form.TextArea
        id="notes"
        title="Notes"
        placeholder="Optional notes about this address"
        value={notes}
        onChange={setNotes}
      />
      <Form.Description text={existingEntry ? "Update this saved address" : "Save this address to your address book"} />
    </Form>
  );
}
