/* Copyright (c) 2022~present by tisfeng, maxchang3, All Rights Reserved. */

import ProviderManagementPage from "@/components/pages/ProviderManagementPage";
import { useAIProviderProfiles } from "@/hooks";

export default function ManageProviders() {
  const controller = useAIProviderProfiles();
  return <ProviderManagementPage controller={controller} />;
}
