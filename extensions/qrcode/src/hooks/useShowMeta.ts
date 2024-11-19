import { useEffect, useState } from "react";
import { useLocalStorage } from "@raycast/utils";

const STORAGE_KEY = "qrcode-show-metadata";

export function useShowMetadata() {
    const { value, setValue } = useLocalStorage<boolean>(STORAGE_KEY);

    const [needShowMetadata, setNeedShowMetadata] = useState(value || false);

    useEffect(() => {
        setNeedShowMetadata(value ?? false);
    }, [value])

    const showMetadata = () => {
        setNeedShowMetadata(true);
        setValue(true);
    }
    const hideMetadata = () => {
        setNeedShowMetadata(false);
        setValue(false);
    }

    return {
        needShowMetadata,
        showMetadata,
        hideMetadata
    };
} 
