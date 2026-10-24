/* Copyright (c) 2022~present by tisfeng, maxchang3, All Rights Reserved. */

import ProviderManagementPage from "@/features/provider-management/ProviderManagementPage";
import { useAIProviderProfiles } from "@/providers/profiles/useAIProviderProfiles";

export default function ManageProviders() {
  const controller = useAIProviderProfiles();
  return <ProviderManagementPage controller={controller} />;
}
