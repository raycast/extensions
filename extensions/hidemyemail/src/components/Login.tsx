import { useState } from "react";
import { LocalStorage, showToast, Toast, getPreferenceValues } from "@raycast/api";
import { iCloudService } from "../api/connect";
import TwoFactorAuthForm from "./forms/TwoFactorAuthForm";
import { LoginForm } from "./forms/LoginForm";
import { iCloudError, iCloudFailedLoginError } from "../api/errors";

const AuthState = {
  UNAUTHENTICATED: 0,
  REQUIRES_2FA: 1,
  AUTHENTICATED: 2,
};

export async function getiCloudService() {
  const { useChineseAccount } = getPreferenceValues<Preferences>();
  const appleID = await LocalStorage.getItem<string>("appleID");

  if (!appleID) {
    throw new iCloudFailedLoginError("No credentials");
  }
  const iService = new iCloudService(appleID, { useChineseAccount });
  await iService.init();
  await iService.authenticate();
  if (!iService.hideMyEmail.isActive()) {
    throw new iCloudError("Are you sure the Hide My Email feature is activated?");
  }

  if (iService.requires2FA) {
    throw new iCloudFailedLoginError("Two-factor authentication required");
  }
  return iService;
}

export function Login({ onLogin }: { onLogin: (service: iCloudService) => void }) {
  const [isAuthenticated, setIsAuthenticated] = useState<number | null>(AuthState.UNAUTHENTICATED);
  const [service, setService] = useState<iCloudService | null>(null);

  async function handleLogin(appleID: string, password: string | null = null) {
    const { useChineseAccount } = getPreferenceValues<Preferences>();

    // Password exists means apple ID did not exist and login form
    // was shown so store apple ID in LocalStorage
    if (password) await LocalStorage.setItem("appleID", appleID);

    const iService = new iCloudService(appleID, { useChineseAccount });
    await iService.init();

    const toast = await showToast({ style: Toast.Style.Animated, title: "Logging in..." });
    try {
      await iService.authenticate(password);
      // Valid credentials, might require 2FA
      setService(iService);

      if (!iService.hideMyEmail.isActive()) {
        toast.style = Toast.Style.Failure;
        toast.title = "Unable to access service";
        toast.message = "Are you sure the Hide My Email feature is activated?";
        setIsAuthenticated(AuthState.UNAUTHENTICATED);
        return;
      }

      if (!iService.requires2FA) {
        onLogin(iService);
        toast.style = Toast.Style.Success;
        toast.title = "Logged in";
      } else {
        setIsAuthenticated(AuthState.REQUIRES_2FA);
        toast.hide();
      }
    } catch (error) {
      toast.style = Toast.Style.Failure;
      toast.title = "Login failed";
      toast.message = (error as { message: string }).message;
      setIsAuthenticated(AuthState.UNAUTHENTICATED);
    }
  }

  async function handle2FA(code: string) {
    if (service) {
      const toast = await showToast({ style: Toast.Style.Animated, title: "Verifying 2FA code..." });
      try {
        await service.validate2FACode(code);
        // This will remove the component since we are done authenticating
        onLogin(service);
        toast.style = Toast.Style.Success;
        toast.title = "Logged in";
      } catch (error) {
        toast.style = Toast.Style.Failure;
        toast.title = "2FA failed";
        toast.message = (error as { message: string }).message;
      }
    }
  }

  async function resendCode() {
    if (service) {
      try {
        const lastDigits = await service.sendVerificationCode();
        let message;
        if (lastDigits)
          message = `Enter the verification code sent as a message to number ending with digits ${lastDigits}.`;
        else message = `Enter the verification code sent to your trusted device(s)`;

        await showToast({ style: Toast.Style.Success, title: "Code sent", message });
      } catch (error) {
        await showToast({
          style: Toast.Style.Failure,
          title: "Resending 2FA code failed",
          message: (error as { message: string }).message,
        });
      }
    }
  }

  if (isAuthenticated === AuthState.UNAUTHENTICATED) {
    return (
      <LoginForm
        submit={async (credentials) => {
          await handleLogin(credentials.appleID, credentials.password);
        }}
      />
    );
  }

  if (isAuthenticated === AuthState.REQUIRES_2FA) {
    return (
      <TwoFactorAuthForm
        submit={handle2FA}
        resendCode={async () => {
          await resendCode();
        }}
      />
    );
  }
}
