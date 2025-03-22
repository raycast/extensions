import { LocalStorage } from "@raycast/api";
import { useState, useEffect } from "react";
import { ServiceFragment } from "./client";

const VISITED_SERVICES_KEY = "VISITED_SERVICES";
const VISITED_SERVICES_LENGTH = 10;

async function loadVisitedServices() {
    const item = await LocalStorage.getItem<string>(VISITED_SERVICES_KEY);
    if (item) {
        const parsed = JSON.parse(item);
        return parsed as ServiceFragment[];
    } else {
        return [];
    }
}

async function saveVisitedServices(services: ServiceFragment[]) {
    const data = JSON.stringify(services);
    await LocalStorage.setItem(VISITED_SERVICES_KEY, data);
}

export async function clearVisitedServices() {
    return await LocalStorage.removeItem(VISITED_SERVICES_KEY);
}

export function useVisitedServices() {
    const [services, setServices] = useState<ServiceFragment[]>();

    useEffect(() => {
        loadVisitedServices().then(setServices);
    }, []);

    function visitService(service: ServiceFragment) {
        const nextServices = [service, ...(services?.filter((item) => item.id !== service.id) ?? [])].slice(
            0,
            VISITED_SERVICES_LENGTH
        );
        setServices(nextServices);
        saveVisitedServices(nextServices);
    }

    return { services, visitService, isLoading: !services };
}
