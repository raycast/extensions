import React from "react";
import { OnboardingForm } from "./components/onboarding-form";
import { ProfileForm } from "./components/profile-form";
import { useDashboardSnapshot } from "./lib/use-dashboard-snapshot";

export default function ProfileCommand() {
  const { snapshot, isLoading, reload } = useDashboardSnapshot();

  if (snapshot && !snapshot.hasCredentials && snapshot.source === "empty") {
    return <OnboardingForm onSaved={() => reload(true)} />;
  }

  if (!snapshot && isLoading) {
    return <ProfileForm snapshot={null} />;
  }

  return <ProfileForm snapshot={snapshot} />;
}
