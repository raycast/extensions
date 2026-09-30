// src/create-payment-link.tsx
import { ActionPanel, Action, Form, showToast, Toast, Clipboard, Icon, closeMainWindow, List } from "@raycast/api";
import { useState, useEffect } from "react";
import { authorize } from "./oauth";

// Interface for a Mollie website profile.
interface Profile {
  id: string;
  name: string;
}

// Interface for the values captured from the form.
interface FormValues {
  profileId: string;
  amount: string;
  description: string;
  redirectUrl: string;
  isReusable: boolean;
  isOpenAmount: boolean;
  expiresAt: Date | null;
}

// Interface for Mollie API error responses
interface MollieErrorResponse {
  detail?: string;
  title?: string;
}

// Interface for Mollie payment/payment-link response
interface MolliePaymentResponse {
  _links: {
    paymentLink?: { href: string };
    checkout?: { href: string };
  };
}

// This is the main function for the new command.
export default function CreatePaymentLink() {
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);

  // Step 1: Handle authorization explicitly when the command loads.
  useEffect(() => {
    async function doAuthorize() {
      try {
        const token = await authorize();
        setAccessToken(token);
      } catch (err) {
        console.error("Authorization failed:", err);
        setError(err as Error);
        showToast(Toast.Style.Failure, "Authorization Failed", (err as Error).message);
      } finally {
        setIsLoading(false);
      }
    }
    doAuthorize();
  }, []);

  // If there was an auth error, show it to the user.
  if (error) {
    return (
      <List>
        <List.EmptyView title="Authorization Failed" description={error.message} icon={Icon.Warning} />
      </List>
    );
  }

  // If we have an access token, render the form. Otherwise, show a loading indicator.
  return isLoading ? <List isLoading={true} /> : <PaymentLinkForm accessToken={accessToken!} />;
}

// The actual form component, now separated and only rendered when we have a token.
function PaymentLinkForm({ accessToken }: { accessToken: string }) {
  const [amountError, setAmountError] = useState<string | undefined>();
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [isLoadingProfiles, setIsLoadingProfiles] = useState<boolean>(true);
  const [isOpenAmount, setIsOpenAmount] = useState<boolean>(false);

  // Step 2: Fetch profiles now that we are sure we have an access token.
  useEffect(() => {
    async function fetchProfiles() {
      if (!accessToken) return;

      try {
        const response = await fetch("https://api.mollie.com/v2/profiles", {
          headers: { Authorization: `Bearer ${accessToken}` },
        });

        if (!response.ok) {
          const errorBody = (await response.json()) as MollieErrorResponse;
          throw new Error(errorBody.detail || `API returned status ${response.status}`);
        }

        const data = (await response.json()) as { _embedded: { profiles: Profile[] } };
        const availableProfiles = data._embedded.profiles.filter((p) => p.id.startsWith("pfl_"));

        if (availableProfiles.length === 0) {
          showToast(
            Toast.Style.Failure,
            "No Active Profiles Found",
            "Please make sure you have at least one active website profile in your Mollie account.",
          );
        }
        setProfiles(availableProfiles);
      } catch (error) {
        showToast(
          Toast.Style.Failure,
          "Could Not Load Website Profiles",
          error instanceof Error ? error.message : "An unknown error occurred",
        );
      } finally {
        setIsLoadingProfiles(false);
      }
    }

    fetchProfiles();
  }, [accessToken]);

  function validateAmount(value: string | undefined) {
    if (value && (isNaN(Number(value)) || Number(value) < 0)) {
      setAmountError("Please enter a valid positive number.");
    } else {
      setAmountError(undefined);
    }
  }

  async function handleSubmit(values: FormValues) {
    if (!values.isOpenAmount && !values.amount) {
      setAmountError("Amount is required for a fixed payment.");
      return;
    }

    const toast = await showToast({ style: Toast.Style.Animated, title: "Creating Payment Link..." });

    try {
      const usePaymentLinksEndpoint = values.isOpenAmount || values.isReusable;
      const endpoint = usePaymentLinksEndpoint
        ? "https://api.mollie.com/v2/payment-links"
        : "https://api.mollie.com/v2/payments";

      const body: { [key: string]: unknown } = {
        description: values.description,
        redirectUrl: values.redirectUrl || `https://mollie.com/dashboard/payments`,
        profileId: values.profileId,
      };

      if (values.expiresAt) body.expiresAt = values.expiresAt.toISOString().split("T")[0];

      if (usePaymentLinksEndpoint) {
        body.reusable = values.isReusable;
        if (values.isOpenAmount) {
          if (values.amount) body.minimumAmount = { currency: "EUR", value: parseFloat(values.amount).toFixed(2) };
        } else {
          body.amount = { currency: "EUR", value: parseFloat(values.amount).toFixed(2) };
        }
      } else {
        body.amount = { currency: "EUR", value: parseFloat(values.amount).toFixed(2) };
      }

      const response = await fetch(endpoint, {
        method: "POST",
        headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const responseData = (await response.json()) as MolliePaymentResponse & MollieErrorResponse;
      if (!response.ok)
        throw new Error(responseData.detail || responseData.title || `HTTP error! Status: ${response.status}`);

      const paymentLink = usePaymentLinksEndpoint
        ? responseData._links.paymentLink?.href
        : responseData._links.checkout?.href;

      if (!paymentLink) {
        throw new Error("No payment link found in response");
      }
      await Clipboard.copy(paymentLink);

      toast.style = Toast.Style.Success;
      toast.title = "Success!";
      toast.message = "Payment link copied to clipboard.";

      setTimeout(() => closeMainWindow({ clearRootSearch: true }), 1000);
    } catch (error) {
      toast.style = Toast.Style.Failure;
      toast.title = "Failed to Create Link";
      toast.message = error instanceof Error ? error.message : "An unknown error occurred.";
    }
  }

  return (
    <Form
      isLoading={isLoadingProfiles}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Create Payment Link" icon={Icon.Link} onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.Dropdown id="profileId" title="Profile" storeValue>
        {profiles.map((profile) => (
          <Form.Dropdown.Item key={profile.id} value={profile.id} title={profile.name} />
        ))}
      </Form.Dropdown>
      <Form.TextField
        id="amount"
        title={isOpenAmount ? "Minimum Amount (Optional)" : "Amount (EUR)"}
        placeholder="e.g., 10.95"
        error={amountError}
        onChange={validateAmount}
        onBlur={(event) => validateAmount(event.target.value)}
      />
      <Form.TextField id="description" title="Description" placeholder="e.g., Payment for Invoice #123" />
      <Form.Checkbox
        id="isOpenAmount"
        label="Allow customer to determine amount"
        value={isOpenAmount}
        onChange={setIsOpenAmount}
      />
      <Form.Checkbox id="isReusable" label="Create a reusable link" storeValue />
      <Form.Separator />
      <Form.TextField
        id="redirectUrl"
        title="Redirect URL (Optional)"
        placeholder="e.g., https://your-website.com/thank-you"
      />
      <Form.DatePicker id="expiresAt" title="Expiry Date (Optional)" />
    </Form>
  );
}
