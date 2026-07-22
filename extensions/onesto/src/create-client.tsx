import { Action, ActionPanel, Form, Icon, Toast, showToast } from "@raycast/api";
import { useState } from "react";
import { createClientFromVat, createClientManual } from "./api";

export default function CreateClient() {
  const [manual, setManual] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  async function submit(values: {
    piva: string;
    name: string;
    address: string;
    cap: string;
    city: string;
    province: string;
    country: string;
    sdi: string;
    pec: string;
    email: string;
  }) {
    if (submitting) return;

    if (!manual) {
      const piva = values.piva.replace(/\D/g, "");
      if (piva.length !== 11) {
        await showToast({ style: Toast.Style.Failure, title: "Enter a valid 11-digit VAT number" });
        return;
      }
      setSubmitting(true);
      const toast = await showToast({ style: Toast.Style.Animated, title: "Looking up VAT number…" });
      try {
        const client = await createClientFromVat(piva);
        toast.style = Toast.Style.Success;
        toast.title = "Client created";
        toast.message = client.name;
      } catch (e) {
        toast.style = Toast.Style.Failure;
        toast.title = "Could not create client";
        toast.message = e instanceof Error ? e.message : String(e);
      } finally {
        setSubmitting(false);
      }
      return;
    }

    if (!values.name.trim()) {
      await showToast({ style: Toast.Style.Failure, title: "Enter the client name" });
      return;
    }
    setSubmitting(true);
    const toast = await showToast({ style: Toast.Style.Animated, title: "Creating client…" });
    try {
      const client = await createClientManual({
        name: values.name.trim(),
        piva: values.piva.replace(/\D/g, "") || undefined,
        address: values.address.trim() || undefined,
        cap: values.cap.trim() || undefined,
        city: values.city.trim() || undefined,
        province: values.province.trim().toUpperCase() || undefined,
        country: values.country.trim().toUpperCase() || "IT",
        sdi: values.sdi.trim() || undefined,
        pec: values.pec.trim() || undefined,
        email: values.email.trim() || undefined,
      });
      toast.style = Toast.Style.Success;
      toast.title = "Client created";
      toast.message = client.name;
    } catch (e) {
      toast.style = Toast.Style.Failure;
      toast.title = "Could not create client";
      toast.message = e instanceof Error ? e.message : String(e);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Form
      isLoading={submitting}
      navigationTitle="Create Client"
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Create Client" icon={Icon.AddPerson} onSubmit={submit} />
        </ActionPanel>
      }
    >
      <Form.Description text="By default the client is created automatically from its Italian VAT number (registry lookup). Switch to manual for foreign clients or custom data." />
      <Form.TextField
        id="piva"
        title="VAT Number (P.IVA)"
        placeholder="11 digits, e.g. 14288140966"
        autoFocus={!manual}
      />
      <Form.Checkbox id="manualMode" label="Enter details manually" value={manual} onChange={setManual} />

      {manual && (
        <>
          <Form.Separator />
          <Form.TextField id="name" title="Name" placeholder="Company or person name" />
          <Form.TextField id="address" title="Address" placeholder="Street and number" />
          <Form.TextField id="cap" title="ZIP" placeholder="e.g. 20121" />
          <Form.TextField id="city" title="City" placeholder="e.g. Milano" />
          <Form.TextField id="province" title="Province" placeholder="e.g. MI (required for IT)" />
          <Form.TextField id="country" title="Country" defaultValue="IT" placeholder="ISO code, e.g. IT" />
          <Form.TextField id="sdi" title="SDI Code" placeholder="Optional" />
          <Form.TextField id="pec" title="PEC" placeholder="Optional" />
          <Form.TextField id="email" title="Email" placeholder="Optional" />
        </>
      )}
    </Form>
  );
}
