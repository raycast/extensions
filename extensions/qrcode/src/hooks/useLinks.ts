import { useCallback } from "react";
import { useLocalStorage } from "@raycast/utils";
import { LinkItem } from "../types";

const STORAGE_KEY = "qrcode-links-storage";

export function useLinks() {
    const { value: links, setValue: setLinks, isLoading } = useLocalStorage<LinkItem[]>(STORAGE_KEY, []);

    const addLink = useCallback((link: LinkItem) => {
        setLinks([link, ...(links || [])]);
    }, [setLinks]);

    const deleteLink = useCallback((id: string) => {
        setLinks((links || []).filter((item) => item.id !== id));
    }, [setLinks]);

    return {
        links: links || [],
        isLoading,
        addLink,
        deleteLink
    };
} 
