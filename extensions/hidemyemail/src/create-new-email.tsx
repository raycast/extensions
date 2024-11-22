import { useState } from "react";
import { PopToRootType, showHUD, showToast, Toast, Clipboard } from "@raycast/api";
import { iCloudService } from "./api/connect";
import { MetaData } from "./api/hide-my-email";
import { Login } from "./components/Login";
import { AddressForm } from "./components/forms/AddressForm";

export default function Command() {
  const [service, setService] = useState<iCloudService | null>(null);

  if (!service) {
    return <Login onLogin={(iService: iCloudService) => setService(iService)} />;
  }

  async function handleCopy(address: string) {
    Clipboard.copy(address);
    await showHUD("Email added & copied", {
      clearRootSearch: false,
      popToRootType: PopToRootType.Immediate,
    });
  }

  async function add(address: string, metaData: MetaData) {
    const toast = await showToast({ style: Toast.Style.Animated, title: "Adding email..." });
    try {
      await service?.hideMyEmail.addAddress(address, metaData);
      await handleCopy(address);
    } catch (error) {
      toast.style = Toast.Style.Failure;
      toast.title = "Adding failed";
      toast.message = (error as { message: string }).message;
    }
  }

  return (
    <AddressForm
      service={service}
      submit={async (address, metaData) => {
        await add(address, metaData);
      }}
    />
  );
}
