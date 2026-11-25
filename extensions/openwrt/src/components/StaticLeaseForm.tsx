import { isIPv4 } from "node:net";
import { useRef, useState } from "react";
import { Action, ActionPanel, Form, Icon, Toast, getPreferenceValues, showToast, useNavigation } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { invalidateCachedKey } from "../lib/cache";
import { addStaticDhcpLease } from "../lib/openwrt-extras";
import type { ExtensionPreferences } from "../lib/types";
import { getErrorDescription } from "../lib/ubus";

export interface StaticLeaseFormProps {
  initialName?: string;
  initialMac?: string;
  initialIp?: string;
  onSuccess?: () => void;
}

const HOSTNAME_PATTERN = /^[a-zA-Z0-9][a-zA-Z0-9._-]{0,127}$/;
const MAC_PATTERN = /^([0-9a-fA-F]{2}:){5}[0-9a-fA-F]{2}$/;
const LEASETIME_PATTERN = /^(\d+[smhdw]?|infinite)$/i;

function normalizeMacInput(raw: string): string {
  return raw.trim().replace(/-/g, ":").toUpperCase();
}

/** Form view to create a new UCI static DHCP lease (`host` section) on OpenWrt. */
export function StaticLeaseForm({ initialName, initialMac, initialIp, onSuccess }: StaticLeaseFormProps) {
  const { pop } = useNavigation();
  const submittingRef = useRef(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [nameError, setNameError] = useState<string | undefined>();
  const [macError, setMacError] = useState<string | undefined>();
  const [ipError, setIpError] = useState<string | undefined>();
  const [leasetimeError, setLeasetimeError] = useState<string | undefined>();

  async function handleSubmit(values: { name: string; mac: string; ip: string; leasetime: string }) {
    if (submittingRef.current) {
      return;
    }

    const trimmedName = values.name.trim();
    const normalizedMac = normalizeMacInput(values.mac);
    const trimmedIp = values.ip.trim();
    const trimmedLeasetime = values.leasetime.trim();

    let hasError = false;

    if (!trimmedName || !HOSTNAME_PATTERN.test(trimmedName)) {
      setNameError("Enter a valid hostname (letters, digits, '.', '_', or '-', not starting with '-').");
      hasError = true;
    } else {
      setNameError(undefined);
    }

    if (!MAC_PATTERN.test(normalizedMac)) {
      setMacError("Enter a valid MAC address in AA:BB:CC:DD:EE:FF format.");
      hasError = true;
    } else {
      setMacError(undefined);
    }

    if (!isIPv4(trimmedIp)) {
      setIpError("Enter a valid IPv4 address (for example 192.168.1.50).");
      hasError = true;
    } else {
      setIpError(undefined);
    }

    if (trimmedLeasetime && !LEASETIME_PATTERN.test(trimmedLeasetime)) {
      setLeasetimeError("Use a duration such as 12h, 30m, 3600, or infinite.");
      hasError = true;
    } else {
      setLeasetimeError(undefined);
    }

    if (hasError) {
      return;
    }

    submittingRef.current = true;
    setIsSubmitting(true);
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: `Saving static lease for ${trimmedName}...`,
    });

    try {
      const prefs = getPreferenceValues<ExtensionPreferences>();
      await addStaticDhcpLease(
        {
          name: trimmedName,
          mac: normalizedMac,
          ip: trimmedIp,
          leasetime: trimmedLeasetime || undefined,
        },
        prefs,
      );
      invalidateCachedKey("dhcp-dns", prefs.routerUrl, "", prefs.username?.trim() || "root");
      toast.style = Toast.Style.Success;
      toast.title = "Static DHCP Lease Added";
      toast.message = `${trimmedName} (${trimmedIp})`;
      onSuccess?.();
      pop();
    } catch (err) {
      await toast.hide();
      const { title, message } = getErrorDescription(err);
      await showFailureToast(message, { title });
    } finally {
      submittingRef.current = false;
      setIsSubmitting(false);
    }
  }

  return (
    <Form
      isLoading={isSubmitting}
      navigationTitle="Add Static DHCP Lease"
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Save Static DHCP Lease" icon={Icon.Check} onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="name"
        title="Hostname"
        placeholder="nas"
        defaultValue={initialName ?? ""}
        error={nameError}
        onChange={() => {
          if (nameError) {
            setNameError(undefined);
          }
        }}
      />
      <Form.TextField
        id="mac"
        title="MAC Address"
        placeholder="AA:BB:CC:DD:EE:FF"
        defaultValue={initialMac ?? ""}
        error={macError}
        onChange={() => {
          if (macError) {
            setMacError(undefined);
          }
        }}
      />
      <Form.TextField
        id="ip"
        title="IPv4 Address"
        placeholder="192.168.1.50"
        defaultValue={initialIp ?? ""}
        error={ipError}
        onChange={() => {
          if (ipError) {
            setIpError(undefined);
          }
        }}
      />
      <Form.TextField
        id="leasetime"
        title="Lease Time"
        placeholder="12h"
        info="Optional lease duration (for example 12h, 30m, or infinite). Leave blank for the router default."
        error={leasetimeError}
        onChange={() => {
          if (leasetimeError) {
            setLeasetimeError(undefined);
          }
        }}
      />
    </Form>
  );
}
