import { Action, ActionPanel, Form, Icon, useNavigation, showToast, Toast, Detail } from "@raycast/api";
import { useState } from "react";
import { useProfileContext } from "@src/hooks";
import Stripe from "stripe";
import { STRIPE_API_VERSION } from "@src/enums";

interface WelcomeScreenProps {
  onComplete?: () => void;
}

export const WelcomeScreen = ({ onComplete }: WelcomeScreenProps) => {
  const { profiles, activeProfile, addProfile, updateProfile } = useProfileContext();
  const { pop } = useNavigation();
  const [isValidating, setIsValidating] = useState(false);

  const hasExistingProfile = profiles.length > 0;
  const needsKeys = hasExistingProfile && !activeProfile?.testApiKey && !activeProfile?.liveApiKey;

  const handleSubmit = async (values: { profileName?: string; testApiKey: string; liveApiKey: string }) => {
    setIsValidating(true);

    try {
      // Validate at least one key is provided
      if (!values.testApiKey?.trim() && !values.liveApiKey?.trim()) {
        await showToast({
          style: Toast.Style.Failure,
          title: "API Key Required",
          message: "Please provide at least one API key (Test or Live)",
        });
        setIsValidating(false);
        return;
      }

      // Validate Test key if provided
      if (values.testApiKey?.trim()) {
        if (!values.testApiKey.startsWith("sk_test_")) {
          await showToast({
            style: Toast.Style.Failure,
            title: "Invalid Test Key",
            message: "Test API key must start with sk_test_",
          });
          setIsValidating(false);
          return;
        }

        // Test the key
        try {
          const stripe = new Stripe(values.testApiKey, { apiVersion: STRIPE_API_VERSION });
          await stripe.balance.retrieve();
        } catch (error) {
          await showToast({
            style: Toast.Style.Failure,
            title: "Invalid Test Key",
            message: "Could not authenticate with this Test API key",
          });
          setIsValidating(false);
          return;
        }
      }

      // Validate Live key if provided
      if (values.liveApiKey?.trim()) {
        if (!values.liveApiKey.startsWith("sk_live_")) {
          await showToast({
            style: Toast.Style.Failure,
            title: "Invalid Live Key",
            message: "Live API key must start with sk_live_",
          });
          setIsValidating(false);
          return;
        }

        // Test the key
        try {
          const stripe = new Stripe(values.liveApiKey, { apiVersion: STRIPE_API_VERSION });
          await stripe.balance.retrieve();
        } catch (error) {
          await showToast({
            style: Toast.Style.Failure,
            title: "Invalid Live Key",
            message: "Could not authenticate with this Live API key",
          });
          setIsValidating(false);
          return;
        }
      }

      // Save the keys
      if (needsKeys && activeProfile) {
        // Update existing profile
        await updateProfile(activeProfile.id, {
          testApiKey: values.testApiKey?.trim() || activeProfile.testApiKey,
          liveApiKey: values.liveApiKey?.trim() || activeProfile.liveApiKey,
        });
      } else {
        // Create new profile
        await addProfile({
          name: values.profileName?.trim() || "My Stripe Account",
          testApiKey: values.testApiKey?.trim() || undefined,
          liveApiKey: values.liveApiKey?.trim() || undefined,
          color: "#635BFF",
          isDefault: true,
        });
      }

      await showToast({
        style: Toast.Style.Success,
        title: "Setup Complete!",
        message: "Your Stripe account is now connected",
      });

      setIsValidating(false);

      if (onComplete) {
        onComplete();
      } else {
        pop();
      }
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Setup Failed",
        message: error instanceof Error ? error.message : "Unknown error",
      });
      setIsValidating(false);
    }
  };

  return (
    <Form
      isLoading={isValidating}
      actions={
        <ActionPanel>
          <Action.SubmitForm title={needsKeys ? "Add Api Keys" : "Complete Setup"} onSubmit={handleSubmit} />
          <Action.OpenInBrowser
            title="Get Api Keys from Stripe Dashboard"
            url="https://dashboard.stripe.com/apikeys"
            shortcut={{ modifiers: ["cmd"], key: "o" }}
          />
        </ActionPanel>
      }
    >
      <Form.Description
        title="Welcome to Stripe Extension!"
        text={
          needsKeys
            ? `Add your Stripe API keys to get started with "${activeProfile?.name || "your account"}".`
            : "Connect your Stripe account to view charges, customers, events, and more."
        }
      />

      <Form.Separator />

      {!needsKeys && (
        <>
          <Form.TextField
            id="profileName"
            title="Account Name"
            placeholder="e.g., My Business, Client A"
            defaultValue="My Stripe Account"
            info="A friendly name to identify this Stripe account"
          />
          <Form.Separator />
        </>
      )}

      <Form.Description
        title="Step 1: Get Your API Keys"
        text="1. Go to Stripe Dashboard → Developers → API Keys
2. Copy your Secret key (NOT Publishable key)
3. Paste it below"
      />

      <Form.PasswordField
        id="testApiKey"
        title="Test Mode API Key"
        placeholder="sk_test_..."
        info="Optional: For testing without real transactions"
      />

      <Form.PasswordField
        id="liveApiKey"
        title="Live Mode API Key"
        placeholder="sk_live_..."
        info="Optional: For production/real transactions"
      />

      <Form.Separator />

      <Form.Description text="💡 Tip: You can add more accounts later in 'Manage Stripe Accounts'" />
    </Form>
  );
};

export const WelcomeDetail = () => {
  const { push } = useNavigation();

  return (
    <Detail
      markdown={`
# Welcome to Stripe for Raycast! 🎉

Get quick access to your Stripe dashboard data right from Raycast.

## What You Can Do

- View charges, customers, and events
- Check account balance
- Manage subscriptions
- Create payment links and coupons
- Switch between multiple Stripe accounts
- Toggle between Test and Live modes

## Get Started

Click "Setup Stripe Account" below to connect your first account.

You'll need:
- A Stripe account
- Your Secret API key (from Stripe Dashboard)

---

**Don't have a Stripe account?**  
Visit [stripe.com](https://stripe.com) to sign up.
`}
      actions={
        <ActionPanel>
          <Action title="Setup Stripe Account" icon={Icon.Plus} onAction={() => push(<WelcomeScreen />)} />
          <Action.OpenInBrowser
            title="Open Stripe Dashboard"
            url="https://dashboard.stripe.com"
            shortcut={{ modifiers: ["cmd"], key: "o" }}
          />
          <Action.OpenInBrowser
            title="Get Api Keys"
            url="https://dashboard.stripe.com/apikeys"
            shortcut={{ modifiers: ["cmd"], key: "k" }}
          />
        </ActionPanel>
      }
    />
  );
};
