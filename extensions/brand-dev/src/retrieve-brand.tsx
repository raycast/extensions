import { Detail, LaunchProps, Toast, getPreferenceValues, showToast } from "@raycast/api";
import { useFetch, useLocalStorage } from "@raycast/utils";
import { useEffect, useState } from "react";

type Color = {
    hex: string;
    name: string;
}
type Logo = {
    url: string;
    mode: string;
    group: number;
    colors: Color[];
    resolution: {
        width: number;
        height: number;
    }
}
type Backdrop = {
    url: string;
    colors: Color[];
    resolution: {
        width: number;
        height: number;
    }
}
type Social = {
    type: string;
    url: string;
}
type Brand = {
    domain: string;
title: string;
description: string;
colors: Color[];
logos: Logo[];
backdrops: Backdrop[];
socials: Social[];
verified: boolean;
};
type Response = {
    status: "ok";
    brand: Brand;
}

function getGroupedLogos(brand: Brand) {
        const groupedLogos = brand.logos.reduce((acc, logo) => {
        if (!acc[logo.group]) {
            acc[logo.group] = [];
        }
        acc[logo.group].push(logo);
        return acc;
        }, {} as { [key: string]: Logo[] });
        return groupedLogos;
}

export default function RetrieveBrand(props: LaunchProps<{ arguments: Arguments.RetrieveBrand }>) {
    const { domain } = props.arguments;
    const { api_token } = getPreferenceValues<Preferences>();

    const [brand, setBrand] = useState<Brand>();
    const [groupedLogos, setGroupedLogos] = useState<{ [key: string]: Logo[] }>();
    
    const { value: brands, setValue: setBrands, isLoading: isFetchingLocal } = useLocalStorage<Brand[]>("brands", []);

    const { isLoading: isFetching, revalidate } = useFetch<Response>(`https://api.brand.dev/v1/brand/retrieve?domain=${domain}`, {
        headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${api_token}`
        },
        // mapResult(result: Response) {
        //     const { brand } = result;
        //     const groupedLogos = brand.logos.reduce((acc, logo) => {
        //         if (!acc[logo.group]) {
        //           acc[logo.group] = [];
        //         }
        //         acc[logo.group].push(logo);
        //         return acc;
        //       }, {} as { [key: string]: Logo[] });

        //     return {
        //         data: {...result.brand, groupedLogos}
        //     }
        // },
        async onData(data) {
            await showToast(Toast.Style.Animated, "Fetched! Generating...");
            const newBrands = brands?.map((brand) => (brand.domain === domain ? { ...data.brand } : brand)) ?? [];
            setBrand(data.brand);
            setGroupedLogos(getGroupedLogos(data.brand));
            await setBrands(newBrands);
        },
        execute: false
    });

    const isLoading = isFetchingLocal || isFetching;
    useEffect(() => {
        showToast(Toast.Style.Animated, "Checking Local Storage...");
        if (!isFetchingLocal) {
            console.log(brands);
            const brandInStorage = brands?.find(brand => brand.domain===domain);
            if (brandInStorage) {
                showToast(Toast.Style.Animated, "Found Locally! Generating...");
                setBrand(brandInStorage);
                setGroupedLogos(getGroupedLogos(brandInStorage));
            } else {
                showToast(Toast.Style.Animated, "Not Found Locally! Fetching...");
                revalidate();
            }
        }
    }, [isFetchingLocal]);

      const markdown = !brand ? "Generating..." : `![](${brand.logos[0].url})
    
${brand.title} \n\n [${brand.domain}](${brand.domain})

${brand.colors.map(color => `- ![${color.name}](https://placehold.co/30x30/${color.hex.substring(1)}/${color.hex.substring(1)}.png) ${color.name}`)}

${brand.description}

---

## Grouped Logos

${groupedLogos && Object.entries(groupedLogos).map(([group, logos]) => `Group ${group}: ${logos.map(logo => `![${logo.url}](${logo.url})`)}`)}`;
    
return <Detail isLoading={isLoading} markdown={markdown} />
}