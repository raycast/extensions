import {
  Action,
  ActionPanel,
  Detail,
  Form,
  Icon,
  Keyboard,
  LaunchProps,
  List,
  Toast,
  getPreferenceValues,
  showToast,
  useNavigation,
} from "@raycast/api";
import { FormValidation, showFailureToast, useFetch, useForm, useLocalStorage } from "@raycast/utils";
import { useEffect, useState } from "react";
import { API_HEADERS, API_URL, capitalize, parseBrandDevResponse } from "./common";
import { Brand } from "./types/brand";

type Response = {
  status: "ok";
  brand: Brand;
};
type BrandInStorage = Brand & {
  created_on: string;
  updated_on: string;
};

export default function RetrieveBrand(props: LaunchProps<{ arguments: Arguments.RetrieveBrands }>) {
  const { push } = useNavigation();
  const { action } = getPreferenceValues<Preferences.RetrieveBrands>();
  const { search } = props.arguments;
  const [searched, setSearched] = useState(!search);
  const [searchText, setSearchText] = useState("");

  const { isLoading, value: brands = [], setValue: setBrands } = useLocalStorage<BrandInStorage[]>("brands", []);

  async function updateBrands(newBrand: BrandInStorage) {
    const newBrands = [...brands];
    const index = newBrands.findIndex((brand) => brand.domain === newBrand.domain);
    if (index !== -1) newBrands[index] = newBrand;
    else newBrands.push(newBrand);
    await setBrands(newBrands);
    push(<ViewBrand brand={newBrand} />);
  }
  async function removeBrand(oldBrand: BrandInStorage) {
    const newBrands = brands;
    const index = newBrands.findIndex((brand) => brand.domain === oldBrand.domain);
    if (index !== -1) newBrands.splice(index, 1);
    await setBrands(newBrands);
  }

  useEffect(() => {
    async function searchAndShow() {
      setSearched(true);
      const brand = brands.find((b) => b.domain === search);
      if (brand) {
        push(<ViewBrand brand={brand} />);
      } else {
        await showFailureToast("No matching brand found", {
          title: search,
          primaryAction: {
            title: "Search Brand",
            onAction() {
              push(<SearchBrand search={search} onSearched={updateBrands} />);
            },
          },
        });
      }
    }
    if (brands.length && !searched) searchAndShow();
  }, [brands]);

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search brand" onSearchTextChange={setSearchText} filtering={true}>
      <List.EmptyView
        title={!searchText ? "No Brands" : "No Results"}
        description={!searchText ? "Search for a brand to get started" : `Search for "${searchText}"`}
        actions={
          <ActionPanel>
            {["Domain", "Ticker", "Name"].map((by) => (
              <Action.Push
                key={by}
                icon={Icon.MagnifyingGlass}
                title={`Search ${searchText || "Brand"} by ${by}`}
                target={<SearchBrand search={searchText} by={by} onSearched={updateBrands} />}
              />
            ))}
          </ActionPanel>
        }
      />
      <List.Section title={`${brands.length} Brands`}>
        {brands.map((brand) => (
          <List.Item
            key={brand.domain}
            icon={brand.logos[0]?.url || Icon.Dot}
            title={brand.domain}
            subtitle={`${brand.title} - ${brand.slogan}`}
            keywords={[`${brand.title}`, `${brand.slogan}`]}
            accessories={[{ date: new Date(brand.updated_on) }]}
            actions={
              <ActionPanel>
                <Action.Push title="View Brand" icon={Icon.Eye} target={<ViewBrand brand={brand} />} />
                {action === "del" ? (
                  <Action
                    icon={Icon.DeleteDocument}
                    style={Action.Style.Destructive}
                    title="Remove Brand"
                    onAction={() => removeBrand(brand)}
                  />
                ) : (
                  <Action.Push
                    icon={Icon.MagnifyingGlass}
                    title="Search Brand"
                    target={<SearchBrand onSearched={updateBrands} />}
                  />
                )}
                <ActionPanel.Section>
                  {action === "del" ? (
                    <Action.Push
                      shortcut={Keyboard.Shortcut.Common.New}
                      icon={Icon.MagnifyingGlass}
                      title="Search Brand"
                      target={<SearchBrand onSearched={updateBrands} />}
                    />
                  ) : (
                    <Action
                      icon={Icon.DeleteDocument}
                      style={Action.Style.Destructive}
                      title="Remove Brand"
                      onAction={() => removeBrand(brand)}
                      shortcut={Keyboard.Shortcut.Common.Remove}
                    />
                  )}
                </ActionPanel.Section>
              </ActionPanel>
            }
          />
        ))}
      </List.Section>
    </List>
  );
}

type SearchBrandProps = {
  search?: string;
  by?: string;
  onSearched: (brand: BrandInStorage) => void;
};
type FormValues = { value: string; by: string };
function SearchBrand({ search, onSearched, by = "Domain" }: SearchBrandProps) {
  const { pop } = useNavigation();
  const [execute, setExecute] = useState(false);

  useEffect(() => {
    if (search) handleSubmit({ value: search, by });
  }, []);

  const { itemProps, handleSubmit, values } = useForm<FormValues>({
    onSubmit() {
      setExecute(true);
    },
    initialValues: {
      value: search,
      by,
    },
    validation: {
      value: FormValidation.Required,
    },
  });

  const { isLoading } = useFetch(API_URL + `/retrieve?${values.by.toLowerCase()}=${values.value}`, {
    headers: API_HEADERS,
    async onWillExecute() {
      await showToast(Toast.Style.Animated, `Retrieving Brand by ${values.by}`, values.value);
    },
    parseResponse: parseBrandDevResponse<Response>,
    async onData(data) {
      await showToast(Toast.Style.Success, "Retrieved Brand!", values.value);
      const newBrand: BrandInStorage = {
        ...data.brand,
        created_on: new Date().toISOString(),
        updated_on: new Date().toISOString(),
      };
      onSearched(newBrand);
      pop();
    },
    execute,
    failureToastOptions: {
      title: "Failed",
    },
  });

  return (
    <Form
      isLoading={isLoading}
      actions={
        <ActionPanel>
          {!isLoading && <Action.SubmitForm icon={Icon.Check} title="Retrieve Brand" onSubmit={handleSubmit} />}
        </ActionPanel>
      }
    >
      <Form.Description text="Search Brand" />
      <Form.TextField
        title={values.by}
        placeholder={
          values.by === "Domain"
            ? "Enter domain (e.g. apple.com)"
            : values.by === "Ticker"
              ? "Enter stock ticker (e.g. AAPL)"
              : "Enter brand name (e.g. Apple)"
        }
        {...itemProps.value}
      />
      <Form.Dropdown title="" {...itemProps.by}>
        <Form.Dropdown.Item title="By Domain" value="Domain" />
        <Form.Dropdown.Item title="By Ticker" value="Ticker" />
        <Form.Dropdown.Item title="By Name" value="Name" />
      </Form.Dropdown>
    </Form>
  );
}

function ViewBrand({ brand }: { brand: BrandInStorage }) {
  const logo = brand.logos[0]?.url;
  const markdown = `# ${brand.title} ${brand.stock ? `(${brand.stock.ticker}, ${brand.stock.exchange})` : ""}

${brand.description}

---

## Logos

${brand.logos.map((logo) => `![${logo.url}](${logo.url}?raycast-height=125)`).join(" ")}

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
          <Detail.Metadata.Separator />
          <Detail.Metadata.TagList title="Colors">
            {brand.colors.map((color) => (
              <Detail.Metadata.TagList.Item key={color.name} text={color.name} color={color.hex} />
            ))}
          </Detail.Metadata.TagList>
          <Detail.Metadata.Separator />
          {brand.fonts?.map((font) => (
            <Detail.Metadata.Label key={font.name + font.usage} title={capitalize(font.usage)} text={font.name} />
          ))}
          <Detail.Metadata.Separator />
          {!brand.socials.length ? (
            <Detail.Metadata.Label title="Socials" text="N/A" />
          ) : (
            brand.socials.map((social) => (
              <Detail.Metadata.Link
                key={social.type}
                title={formatSocialType(social.type)}
                text={social.url}
                target={social.url}
              />
            ))
          )}
          <Detail.Metadata.Separator />
          {!brand.address ? (
            <Detail.Metadata.Label title="Address" text="N/A" />
          ) : (
            <>
              {brand.address.street && <Detail.Metadata.Label title="Street" text={brand.address.street} />}
              {brand.address.city && <Detail.Metadata.Label title="City" text={brand.address.city} />}
              {brand.address.country && <Detail.Metadata.Label title="Country" text={brand.address.country} />}
              {brand.address.country_code && (
                <Detail.Metadata.Label title="Country Code" text={brand.address.country_code} />
              )}
              {brand.address.state_province && (
                <Detail.Metadata.Label title="State / Province" text={brand.address.state_province} />
              )}
              {brand.address.state_code && <Detail.Metadata.Label title="State Code" text={brand.address.state_code} />}
              {brand.address.postal_code && (
                <Detail.Metadata.Label title="Postal Code" text={brand.address.postal_code} />
              )}
              {brand.address.additional_info && (
                <Detail.Metadata.Label title="Additional Info" text={brand.address.additional_info} />
              )}
            </>
          )}
          <Detail.Metadata.Separator />
          {brand.email ? (
            <Detail.Metadata.Link title="Email" text={brand.email} target={`mailto:${brand.email}`} />
          ) : (
            <Detail.Metadata.Label title="Email" text="N/A" />
          )}
          {brand.phone ? (
            <Detail.Metadata.Link title="Phone" text={brand.phone} target={`tel:${brand.phone}`} />
          ) : (
            <Detail.Metadata.Label title="Phone" text="N/A" />
          )}
          <Detail.Metadata.Separator />
          <Detail.Metadata.Label
            title="Content Rating"
            text={brand.is_nsfw === undefined ? "N/A" : brand.is_nsfw ? "Not Safe for Work" : "Safe for Work"}
          />
          <Detail.Metadata.Separator />
          {brand.industries?.eic?.length ? (
            <>
              <Detail.Metadata.Label title="Industries" icon={Icon.EllipsisVertical} />
              {brand.industries.eic.map((e, eIndex) => (
                <Detail.Metadata.Label key={e.industry + eIndex} title={e.industry} text={e.subindustry} />
              ))}
            </>
          ) : (
            <Detail.Metadata.Label title="Industries" text="N/A" />
          )}
          <Detail.Metadata.Separator />
          {brand.links ? (
            <>
              <Detail.Metadata.Label title="Links" icon={Icon.EllipsisVertical} />
              {Object.entries(brand.links).map(([key, val]) =>
                val ? (
                  <Detail.Metadata.Link key={key} title={key} text={val} target={val} />
                ) : (
                  <Detail.Metadata.Label key={key} title={key} text="N/A" />
                ),
              )}
            </>
          ) : (
            <Detail.Metadata.Label title="Links" text="N/A" />
          )}
        </Detail.Metadata>
      }
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            <Action.OpenInBrowser icon={logo} title={`Go to ${brand.domain}`} url={`https://${brand.domain}`} />
            {brand.logos.map((logo, index) => (
              <Action.OpenInBrowser
                key={index}
                shortcut={{ modifiers: ["cmd"], key: (index + 1).toString() as Keyboard.KeyEquivalent }}
                title={`Open Logo # ${index + 1} in Browser`}
                icon={logo.url}
                url={logo.url}
              />
            ))}
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
    case "youtube":
      return "YouTube";
    default:
      return capitalize(type);
  }
}
