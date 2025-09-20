import { useState, useEffect, useRef } from "react";
import { showFailureToast } from "@raycast/utils";
import { Herd } from "../utils/Herd";
import { rescue } from "../utils/rescue";
import { closeMainWindow, Color, showToast } from "@raycast/api";
import { InstalledService, Service } from "../lib/types/service";

interface State {
  loading: boolean;
  availableServices: Service[];
  installedServices: { category: string; services: InstalledService[] }[];
  isProLicense: boolean;
}

export function useServiceState() {
  const [state, setState] = useState<State>({
    loading: true,
    availableServices: [],
    installedServices: [],
    isProLicense: true,
  });

  const hasLoaded = useRef(false);

  async function getServices(): Promise<void> {
    if (hasLoaded.current) return;
    hasLoaded.current = true;

    try {
      setState((prevState) => ({ ...prevState, loading: true }));

      const availableServices = await Herd.Services.all();
      const installedServices: { category: string; services: InstalledService[] }[] = [];

      availableServices
        .filter((service) => service.status === "installed")
        .forEach((service) => {
          const category = service.category
            .map((word) => {
              return word.charAt(0).toUpperCase() + word.slice(1);
            })
            .join(", ");
          const categoryIndex = installedServices.findIndex((c) => category === c.category);
          if (categoryIndex === -1) {
            installedServices.push({ category, services: [...service.installedServices] });
          } else {
            installedServices[categoryIndex].services.push(...service.installedServices);
          }
        });

      const isProLicense = await Herd.General.isPro();

      setState((prevState) => ({ ...prevState, loading: false, availableServices, installedServices, isProLicense }));
    } catch (error) {
      showFailureToast(error, { title: "Could not fetch Services." });
    }
  }

  useEffect(() => {
    getServices();
  }, []);

  async function open(): Promise<void> {
    await closeMainWindow();
    await rescue(() => Herd.General.openSettings("services"), "Could not open Services Overview.");
  }

  async function openUpgrade(): Promise<void> {
    await closeMainWindow();
    await rescue(() => Herd.General.openSettings("licensing"), "Could not open settings.");
  }

  function getAccessories(
    installedService: InstalledService,
  ): Array<{ text: { value: string; color: string }; tooltip: string }> {
    if (installedService.status === "active") {
      return [{ text: { value: "●", color: Color.Green }, tooltip: "Running" }];
    } else {
      return [{ text: { value: "●", color: Color.SecondaryText }, tooltip: "Inactive / Error" }];
    }
  }

  function getDetailMarkdown(installedService: InstalledService): string {
    return ["### Environment Variables", "```env", installedService.env.trim(), "```"].join("\n").trimEnd();
  }

  async function toggleServiceStatus(service: InstalledService): Promise<void> {
    if (state.loading) {
      return;
    }

    setState((prevState) => ({ ...prevState, loading: true }));

    if (service.status === "active") {
      await stop(service);
    } else {
      await start(service);
    }

    await reload();
  }

  async function start(service: InstalledService): Promise<void> {
    if (await rescue(() => Herd.Services.startService(service), `Could not start Service ${service.name}.`)) {
      showToast({ title: `Started Service ${service.name}.` });
    }
  }

  async function stop(service: InstalledService): Promise<void> {
    if (await rescue(() => Herd.Services.stopService(service), `Could not stop Service ${service.name}.`)) {
      showToast({ title: `Stopped Service ${service.name}.` });
    }
  }

  async function reload(): Promise<void> {
    Herd.Services.clearCache();
    hasLoaded.current = false;
    await getServices();
  }

  return {
    state,
    actions: {
      open,
      openUpgrade,
      getAccessories,
      getDetailMarkdown,
      toggleServiceStatus,
    },
  };
}
