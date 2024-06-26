import { Action, ActionPanel, Detail, Icon, LaunchProps, LocalStorage, Toast, getPreferenceValues, showToast } from "@raycast/api";
import { useFetch } from "@raycast/utils";
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
    slogan: string;
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
type BrandInStorage = Brand & {
    created_on: string;
    updated_on: string;
}

export default function RetrieveBrand(props: LaunchProps<{ arguments: Arguments.RetrieveBrand }>) {
    const { domain } = props.arguments;
    const { api_token } = getPreferenceValues<Preferences>();

    const [brand, setBrand] = useState<Brand>();
    
    const [isGetting, setIsGetting] = useState(true);
    const [isSetting, setIsSetting] = useState(false);
    
    const { error, isLoading: isFetching, revalidate } = useFetch<Response>(`https://api.brand.dev/v1/brand/retrieve?domain=${domain}`, {
        headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${api_token}`
        },
        async onData(data) {
            const toast = await showToast(Toast.Style.Animated, "Fetched! Generating...");
            const newBrand: BrandInStorage = {...data.brand, created_on: new Date().toISOString(), updated_on: new Date().toISOString() };
            const brands = await getFromStorage();
            const index = brands.findIndex(brand => brand.domain === domain);
            index!==-1 ? brands[index] = newBrand : brands.push(newBrand);
            setBrand(data.brand);
            setIsSetting(true);
            await LocalStorage.setItem("brands", JSON.stringify(brands));
            setIsSetting(false);
            toast.style = Toast.Style.Success;
            toast.title = "Generated!";
        },
        execute: false
    });

    async function getFromStorage() {
        const localBrands = await LocalStorage.getItem<string>("brands") || "[]";
        const parsedBrands: BrandInStorage[] = await JSON.parse(localBrands);
        return parsedBrands;
    }

    const isLoading = isGetting || isSetting || isFetching;
    useEffect(() => {
        async function checkLocalOrFetch() {
            const toast = await showToast(Toast.Style.Animated, "Checking Local Storage...");
            const brands = await getFromStorage();
            const brandInStorage = brands?.find(brand => brand.domain===domain);
            setIsGetting(false);
            if (brandInStorage) {
                toast.title = "Found Locally! Generating...";
                setBrand(brandInStorage);
                toast.style = Toast.Style.Success;
                toast.title = "Generated!";
            } else {
                toast.title = "Not Found Locally! Fetching...";
                revalidate();
            }
        }
        checkLocalOrFetch();
    }, []);

      const markdown = error ? `${error.message}` : !brand ? "Generating..." : `![](${brand.logos[0].url})
    
${brand.title} \n\n [${brand.domain}](${brand.domain})

${brand.colors.map(color => `- ![${color.name}](https://placehold.co/30x30/${color.hex.substring(1)}/${color.hex.substring(1)}.png) ${color.name}`)}

${brand.description}

---

## Logos

${brand.logos.map(logo => `![${logo.url}](${logo.url})`)}`;
    
return <Detail isLoading={isLoading} markdown={markdown} actions={<ActionPanel>
    {brand && <Action title="Fetch Latest" icon={Icon.Redo} onAction={revalidate} />}
</ActionPanel>} />
}