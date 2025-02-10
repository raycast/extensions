import { useEffect, useRef, useState } from "react";
import { PopToRootType, showHUD, showToast, Toast, Clipboard, Form } from "@raycast/api";
import { iCloudService } from "./api/connect";
import { MetaData } from "./api/hide-my-email";
import { getiCloudService, Login } from "./components/Login";
import { AddressForm, AddressFormValues } from "./components/forms/AddressForm";

export default function Command() {
  const [service, setService] = useState<iCloudService | null>(null);
  const [showLogin, setShowLogin] = useState<boolean>(false);
  const effectRan = useRef(false);

  useEffect(() => {
    // For React Strict Mode, which mounts twice
    if (!effectRan.current) {
      effectRan.current = true;
      (async () => {
        try {
          const iService = await getiCloudService();
          showToast({ style: Toast.Style.Success, title: "Logged in" });
          setService(iService);
        } catch (error) {
          showToast({
            style: Toast.Style.Failure,
            title: "Failed to log in",
            message: (error as { message: string }).message,
          });
          setShowLogin(true);
        }
      })();
    }
  }, []);

  if (!showLogin && !service) {
    return <Form isLoading={true} />;
  }

  if (showLogin) {
    return (
      <Login
        onLogin={(iService) => {
          setService(iService);
          setShowLogin(false);
        }}
      />
    );
  }

  async function handleCopy(address: string) {
    Clipboard.copy(address);
    await showHUD("🔗 Email Added & Copied", {
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
      initialValues={{ label: "", note: "", address: "" }}
      service={service!}
      setService={setService}
      submit={async (values: AddressFormValues) => {
        await add(values.address, { label: values.label, note: values.note });
      }}
    />
  );
}
