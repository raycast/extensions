import {
  Action,
  ActionPanel,
  Detail,
  Form,
  Icon,
  List,
  Toast,
  getPreferenceValues,
  showToast,
  useNavigation,
} from "@raycast/api";
import { FormValidation, useFetch, useForm, useLocalStorage } from "@raycast/utils";
import { useState } from "react";

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
const { api_key } = getPreferenceValues<Preferences>();

export default function RetrieveBrand() {
  const { isLoading, value: brands, setValue: setBrands } = useLocalStorage<BrandInStorage[]>("brands", []);

  async function updateBrands(newBrand: BrandInStorage) {
    const newBrands = brands || [];
    const index = newBrands.findIndex((brand) => brand.domain === newBrand.domain);
    index !== -1 ? (newBrands[index] = newBrand) : newBrands.push(newBrand);
    await setBrands(newBrands);
  }
  async function removeBrand(oldBrand: BrandInStorage) {
    const newBrands = brands || [];
    const index = newBrands.findIndex((brand) => brand.domain === oldBrand.domain);
    if (index !== -1) newBrands.splice(index, 1);
    await setBrands(newBrands);
  }

  return (
    <List isLoading={isLoading}>
      {!isLoading && brands?.length === 0 ? (
        <List.EmptyView
          title="No Brands"
          description="Search for a brand to get started"
          actions={
            <ActionPanel>
              <Action.Push
                icon={Icon.MagnifyingGlass}
                title="Search Brand"
                target={<SearchBrand onSearched={updateBrands} />}
              />
            </ActionPanel>
          }
        />
      ) : (
        <List.Section title={`${brands?.length} Brands`}>
          {brands?.map((brand) => (
            <List.Item
              key={brand.domain}
              icon={brand.logos[0]?.url || Icon.Dot}
              title={brand.domain}
              subtitle={`${brand.title} - ${brand.slogan}`}
              accessories={[{ date: new Date(brand.updated_on) }]}
              actions={
                <ActionPanel>
                  <Action.Push title="View Brand" icon={Icon.Eye} target={<ViewBrand brand={brand} />} />
                  <Action
                    icon={Icon.DeleteDocument}
                    style={Action.Style.Destructive}
                    title="Remove Brand"
                    onAction={() => removeBrand(brand)}
                  />
                  <ActionPanel.Section>
                    <Action.Push
                      shortcut={{ modifiers: ["cmd"], key: "n" }}
                      icon={Icon.MagnifyingGlass}
                      title="Search Brand"
                      target={<SearchBrand onSearched={updateBrands} />}
                    />
                  </ActionPanel.Section>
                </ActionPanel>
              }
            />
          ))}
        </List.Section>
      )}
    </List>
  );
}

type SearchBrandProps = {
  onSearched: (brand: BrandInStorage) => void;
};
function SearchBrand({ onSearched }: SearchBrandProps) {
  const { pop } = useNavigation();
  const [execute, setExecute] = useState(false);
  const { itemProps, handleSubmit, values } = useForm<{ domain: string }>({
    onSubmit() {
      setExecute(true);
    },
    validation: {
      domain: FormValidation.Required,
    },
  });

  const { isLoading } = useFetch<Response>(`https://api.brand.dev/v1/brand/retrieve?domain=${values.domain}`, {
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${api_key}`,
    },
    async onWillExecute() {
      await showToast(Toast.Style.Animated, "Retrieving Brand", values.domain);
    },
    async onData(data) {
      await showToast(Toast.Style.Success, "Retrieved Brand!", values.domain);
      const newBrand: BrandInStorage = {
        ...data.brand,
        created_on: new Date().toISOString(),
        updated_on: new Date().toISOString(),
      };
      onSearched(newBrand);
      pop();
    },
    execute,
  });

  return (
    <Form
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm icon={Icon.Check} title="Retrieve Brand" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField title="Domain" placeholder="brand.dev" {...itemProps.domain} />
    </Form>
  );
}

function ViewBrand({ brand }: { brand: BrandInStorage }) {
  const logo = brand.logos[0]?.url;
  const markdown = `# ${brand.title}

${brand.description}

---

## Logos

${brand.logos.map((logo) => `![${logo.url}](${logo.url})`).join(`\n\n`)}

---

## Backdrops

${brand.backdrops.map(({ url }) => `![${url}](${url})`).join(`\n\n`)}`;

  return (
    <Detail
      markdown={markdown}
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Label title="Domain" icon={logo || Icon.QuestionMark} text={brand.domain} />
          <Detail.Metadata.Label title="Slogan" text={brand.slogan || "N/A"} />
          <Detail.Metadata.Label title="Verified" icon={brand.verified ? Icon.Check : Icon.Multiply} />
          <Detail.Metadata.Separator />
          <Detail.Metadata.TagList title="Colors">
            {brand.colors.map((color) => (
              <Detail.Metadata.TagList.Item key={color.name} text={color.name} color={color.hex} />
            ))}
          </Detail.Metadata.TagList>
          <Detail.Metadata.Separator />
          {brand.socials.map((social) => (
            <Detail.Metadata.Link
              key={social.type}
              title={formatSocialType(social.type)}
              text={social.url}
              target={social.url}
            />
          ))}
        </Detail.Metadata>
      }
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            <Action.OpenInBrowser
              icon="brand-dev.png"
              title="View on brand.dev"
              url={`https://world.brand.dev/brand/${brand.domain}`}
            />
            {brand.logos.length > 0 && (
              <Action.OpenInBrowser title="Open Logo in Browser" icon={brand.logos[0].url} url={brand.logos[0].url} />
            )}
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}

function formatSocialType(type: string) {
  switch (type) {
    case "x":
      return "X (formerly Twitter)";
    case "linkedin":
      return "LinkedIn";
    default:
      return type.charAt(0).toUpperCase() + type.slice(1);
  }
}
