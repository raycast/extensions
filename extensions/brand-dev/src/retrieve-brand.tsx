import {
  Action,
  ActionPanel,
  Detail,
  Icon,
  LaunchProps,
  List,
  LocalStorage,
  Toast,
  getPreferenceValues,
  showToast,
  useNavigation,
} from "@raycast/api";
import { getFavicon, useFetch, useLocalStorage } from "@raycast/utils";
import { useEffect, useState } from "react";

type Color = {
  hex: string;
  name: string;
};
type Logo = {
  url: string;
  mode: string;
  group: number;
  colors: Color[];
  resolution: {
    width: number;
    height: number;
  };
};
type Backdrop = {
  url: string;
  colors: Color[];
  resolution: {
    width: number;
    height: number;
  };
};
type Social = {
  type: string;
  url: string;
};
type Brand = {
  domain: string;
  title: string | null;
  description: string | null;
  slogan: string | null;
  colors: Color[];
  logos: Logo[];
  backdrops: Backdrop[];
  socials: Social[];
  verified: boolean;
};
type Response = {
  status: "ok";
  brand: Brand;
};
type BrandInStorage = Brand & {
  created_on: string;
  updated_on: string;
};

async function getFromStorage() {
  const localBrands = (await LocalStorage.getItem<string>("brands")) || "[]";
  const parsedBrands: BrandInStorage[] = await JSON.parse(localBrands);
  return parsedBrands;
}

export default function RetrieveBrand(props: LaunchProps<{ arguments: Arguments.RetrieveBrand }>) {
  const { domain } = props.arguments;
  const { api_key } = getPreferenceValues<Preferences>();

  const [brand, setBrand] = useState<Brand>();
  const [domainToRetrieve, setDomainToRetrieve] = useState(domain);

  const [isGetting, setIsGetting] = useState(true);
  const [isSetting, setIsSetting] = useState(false);
  const [execute, setExecute] = useState(false);

  const {
    error,
    isLoading: isFetching,
    revalidate,
  } = useFetch<Response>(`https://api.brand.dev/v1/brand/retrieve?domain=${domainToRetrieve}`, {
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${api_key}`,
    },
    async onData(data) {
      const toast = await showToast(Toast.Style.Animated, "Fetched! Generating...");
      const newBrand: BrandInStorage = {
        ...data.brand,
        created_on: new Date().toISOString(),
        updated_on: new Date().toISOString(),
      };
      const brands = await getFromStorage();
      const index = brands.findIndex((brand) => brand.domain === domainToRetrieve);
      index !== -1 ? (brands[index] = newBrand) : brands.push(newBrand);
      setBrand(data.brand);
      setIsSetting(true);
      await LocalStorage.setItem("brands", JSON.stringify(brands));
      setIsSetting(false);
      toast.style = Toast.Style.Success;
      toast.title = "Generated!";
    },
    execute,
  });

  const isLoading = isGetting || isSetting || isFetching;
  useEffect(() => {
    async function checkLocalOrFetch() {
      const toast = await showToast(Toast.Style.Animated, "Checking Local Storage...");
      const brands = await getFromStorage();
      const brandInStorage = brands.find((brand) => brand.domain === domainToRetrieve);
      setIsGetting(false);
      if (brandInStorage) {
        toast.title = "Found Locally! Generating...";
        setBrand(brandInStorage);
        toast.style = Toast.Style.Success;
        toast.title = "Generated!";
      } else {
        toast.title = "Not Found Locally! Fetching...";
        setExecute(true);
      }
    }
    checkLocalOrFetch();
  }, [domainToRetrieve]);

  const markdown = error
    ? `## ERROR \n\n ${error.message}`
    : !brand
      ? "Generating..."
      : `![](${brand.logos[0]?.url})
    
${brand.title} \n\n [${brand.domain}](${brand.domain})

${brand.colors.map((color) => `- ![${color.name}](https://placehold.co/30x30/${color.hex.substring(1)}/${color.hex.substring(1)}.png) ${color.name}`)}

${brand.description}

---

## Logos

${brand.logos.map((logo) => `![${logo.url}](${logo.url})`)}`;

  return (
    <Detail
      isLoading={isLoading}
      markdown={markdown}
      actions={
        <ActionPanel>
          {brand && (
            <ActionPanel.Section>
              <Action.OpenInBrowser
                icon={getFavicon("https://world.brand.dev/")}
                title="View on brand.dev"
                url={`https://world.brand.dev/brand/${brand.domain}`}
              />
              {brand.logos.length && (
                <Action.OpenInBrowser title="Open Logo in Browser" icon={brand.logos[0].url} url={brand.logos[0].url} />
              )}
              <Action
                title="Fetch Latest"
                icon={Icon.Redo}
                onAction={async () => {
                  await showToast(Toast.Style.Animated, `Refreshing ${brand.domain}`);
                  revalidate();
                }}
              />
            </ActionPanel.Section>
          )}
          {!isLoading && (
            <Action.Push
              title="View Storage"
              icon={Icon.Coin}
              target={<ViewStorage onDomainSelected={setDomainToRetrieve} />}
              shortcut={{ modifiers: ["cmd"], key: "v" }}
            />
          )}
        </ActionPanel>
      }
    />
  );
}

type ViewStorageProps = {
  onDomainSelected: (domain: string) => void;
};
function ViewStorage({ onDomainSelected }: ViewStorageProps) {
  const { pop } = useNavigation();
  const { isLoading, value: brands } = useLocalStorage<BrandInStorage[]>("brands");

  return (
    <List isLoading={isLoading}>
      <List.Section title="Storage">
        {brands?.map((brand) => (
          <List.Item
            key={brand.domain}
            icon={brand.logos[0]?.url || Icon.Dot}
            title={brand.domain}
            subtitle={`${brand.title} - ${brand.slogan}`}
            accessories={[{ date: new Date(brand.updated_on) }]}
            actions={
              <ActionPanel>
                <Action
                  title="View Brand"
                  icon={Icon.Eye}
                  onAction={() => {
                    onDomainSelected(brand.domain);
                    pop();
                  }}
                />
              </ActionPanel>
            }
          />
        ))}
      </List.Section>
    </List>
  );
}
