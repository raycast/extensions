import React from "react";
import { Action, ActionPanel, Form, showToast, Toast } from "@raycast/api";
import { PublicKey } from "@solana/web3.js";
import { saveWallet } from "./utils/storage";

export default function AddWallet() {
  async function handleSubmit(values: { name: string; address: string }) {
    try {
      // Validate Solana address
      new PublicKey(values.address);

      await saveWallet({
        name: values.name,
        address: values.address,
      });

      await showToast({
        style: Toast.Style.Success,
        title: "Wallet saved successfully",
      });
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Invalid wallet address",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Add Wallet" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField id="name" title="Wallet Name" placeholder="Enter wallet name" />
      <Form.TextField id="address" title="Wallet Address" placeholder="Enter Solana wallet address" />
    </Form>
  );
}
