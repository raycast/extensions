import { Action, ActionPanel, Form, Icon, List, Toast, showToast, useNavigation } from "@raycast/api";
import { FormValidation, getFavicon, useForm, useLocalStorage } from "@raycast/utils";
import { API_HEADERS, API_URL, parseBrandDevResponse } from "./common";
import { Fragment } from "react/jsx-runtime";

type Button = {
  backgroundColor: string;
  color: string;
  borderColor: string;
  borderRadius: string;
  borderWidth: string;
  borderStyle: string;
  padding: string;
  fontSize: string;
  fontWeight: number;
  textDecoration: string;
  boxShadow: string;
};

type Styleguide = {
  mode: "light" | "dark";
  colors: {
    accent: string;
    background: string;
    text: string;
  };
  typography: {
    headings: {
      h1: {
        fontFamily: string;
        fontSize: string;
        fontWeight: number;
        lineHeight: string;
        letterSpacing: string;
      };
      h2: {
        fontFamily: string;
        fontSize: string;
        fontWeight: number;
        lineHeight: string;
        letterSpacing: string;
      };
      h3: {
        fontFamily: string;
        fontSize: string;
        fontWeight: number;
        lineHeight: string;
        letterSpacing: string;
      };
      h4: {
        fontFamily: string;
        fontSize: string;
        fontWeight: number;
        lineHeight: string;
        letterSpacing: string;
      };
    };
    p: {
      fontFamily: string;
      fontSize: string;
      fontWeight: number;
      lineHeight: string;
      letterSpacing: string;
    };
  };
  elementSpacing: {
    xs: string;
    sm: string;
    md: string;
    lg: string;
    xl: string;
  };
  shadows: {
    sm: string;
    md: string;
    lg: string;
    xl: string;
    inner: string;
  };
  components: {
    button: {
      primary: Button;
      secondary: Button;
      link: Button;
    };
    card: {
      backgroundColor: string;
      borderColor: string;
      borderRadius: string;
      borderWidth: string;
      borderStyle: string;
      padding: string;
      boxShadow: string;
      textColor: string;
    };
  };
};
type StyleguideResult = {
  status: "ok";
  domain: string;
  styleguide: Styleguide;
  code: number;
};
type StyleguideInStorage = {
  domain: string;
  prioritize: string;
  styleguide: Styleguide;
  created_on: string;
  updated_on: string;
};

export default function RetrieveStyleguides() {
  const {
    isLoading,
    value: styleguides = [],
    setValue: setStyleguides,
  } = useLocalStorage<StyleguideInStorage[]>("styleguides", []);

  async function updateStyleguides(newStyleguide: StyleguideInStorage) {
    const newStyleguides = [...styleguides];
    const index = newStyleguides.findIndex((styleguide) => styleguide.domain === newStyleguide.domain);
    if (index !== -1) newStyleguides[index] = newStyleguide;
    else newStyleguides.push(newStyleguide);
    await setStyleguides(newStyleguides);
  }

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search styleguide" isShowingDetail>
      <List.EmptyView
        title="No Results"
        description="Retrieve a styleguide to get started"
        actions={
          <ActionPanel>
            <Action.Push
              icon={Icon.CodeBlock}
              title="Search"
              target={<SearchStyleguide onSearched={updateStyleguides} />}
            />
          </ActionPanel>
        }
      />
      {styleguides.map(({ domain, prioritize, styleguide, created_on }) => (
        <List.Item
          key={domain}
          icon={getFavicon(domain, { fallback: Icon.Image })}
          title={domain}
          accessories={[{ date: new Date(created_on) }]}
          detail={
            <List.Item.Detail
              metadata={
                <List.Item.Detail.Metadata>
                  <List.Item.Detail.Metadata.Label title="Colors" />
                  <List.Item.Detail.Metadata.Label
                    title="Accent"
                    icon={{ source: Icon.CircleFilled, tintColor: styleguide.colors.accent }}
                    text={styleguide.colors.accent}
                  />
                  <List.Item.Detail.Metadata.Label
                    title="Background"
                    icon={{ source: Icon.CircleFilled, tintColor: styleguide.colors.background }}
                    text={styleguide.colors.background}
                  />
                  <List.Item.Detail.Metadata.Label
                    title="Text"
                    icon={{ source: Icon.CircleFilled, tintColor: styleguide.colors.text }}
                    text={styleguide.colors.text}
                  />
                  <List.Item.Detail.Metadata.Separator />

                  <List.Item.Detail.Metadata.Label title="Typography" />
                  {Object.entries({ ...styleguide.typography.headings, ...{ p: styleguide.typography.p } }).map(
                    ([key, val]) => (
                      <Fragment key={key}>
                        <List.Item.Detail.Metadata.Label title={key.toUpperCase()} />
                        <List.Item.Detail.Metadata.Label title="Font Family" text={val.fontFamily} />
                        <List.Item.Detail.Metadata.Label title="Font Size" text={val.fontSize} />
                        <List.Item.Detail.Metadata.Label title="Font Weight" text={val.fontWeight.toString()} />
                        <List.Item.Detail.Metadata.Label title="Line Height" text={val.lineHeight} />
                        <List.Item.Detail.Metadata.Label title="Letter Spacing" text={val.letterSpacing} />
                      </Fragment>
                    ),
                  )}
                  <List.Item.Detail.Metadata.Separator />

                  <List.Item.Detail.Metadata.Label title="Element Spacing" />
                  {Object.entries(styleguide.elementSpacing).map(([key, val]) => (
                    <List.Item.Detail.Metadata.Label key={key} title={key} text={val} />
                  ))}
                  <List.Item.Detail.Metadata.Separator />
                  <List.Item.Detail.Metadata.Label title="Shadows" />
                  {Object.entries(styleguide.shadows).map(([key, val]) => (
                    <List.Item.Detail.Metadata.Label key={key} title={key} text={val} />
                  ))}
                  <List.Item.Detail.Metadata.Separator />

                  <List.Item.Detail.Metadata.Label title="Components" />
                  {/* <List.Item.Detail.Metadata.Separator /> */}
                  {Object.entries(styleguide.components.button).map(([key, val]) => (
                    <Fragment key={key}>
                      <List.Item.Detail.Metadata.Label title={`BUTTON - ${key}`} />
                      <List.Item.Detail.Metadata.Label title="Background Color" text={val.backgroundColor} />
                      <List.Item.Detail.Metadata.Label title="Color" text={val.color} />
                      <List.Item.Detail.Metadata.Label title="Border Color" text={val.borderColor} />
                      <List.Item.Detail.Metadata.Label title="Border Radius" text={val.borderRadius} />
                      <List.Item.Detail.Metadata.Label title="Border Width" text={val.borderWidth} />
                      <List.Item.Detail.Metadata.Label title="Border Style" text={val.borderStyle} />
                      <List.Item.Detail.Metadata.Label title="Padding" text={val.padding} />
                      <List.Item.Detail.Metadata.Label title="Font Size" text={val.fontSize} />
                      <List.Item.Detail.Metadata.Label title="Font Weight" text={val.fontWeight.toString()} />
                      <List.Item.Detail.Metadata.Label title="Text Decoration" text={val.textDecoration} />
                      <List.Item.Detail.Metadata.Label title="Box Shadow" text={val.boxShadow} />
                      {/* <List.Item.Detail.Metadata.Separator /> */}
                      <List.Item.Detail.Metadata.Label title="" />
                    </Fragment>
                  ))}

                  <List.Item.Detail.Metadata.Label title="CARD" />
                  <List.Item.Detail.Metadata.Label
                    title="Background Color"
                    text={styleguide.components.card.backgroundColor}
                  />
                  <List.Item.Detail.Metadata.Label title="Border Color" text={styleguide.components.card.borderColor} />
                  <List.Item.Detail.Metadata.Label
                    title="Border Radius"
                    text={styleguide.components.card.borderRadius}
                  />
                  <List.Item.Detail.Metadata.Label title="Border Width" text={styleguide.components.card.borderWidth} />
                  <List.Item.Detail.Metadata.Label title="Border Style" text={styleguide.components.card.borderStyle} />
                  <List.Item.Detail.Metadata.Label title="Padding" text={styleguide.components.card.padding} />
                  <List.Item.Detail.Metadata.Label title="Box Shadow" text={styleguide.components.card.boxShadow} />
                  <List.Item.Detail.Metadata.Label title="Text Color" text={styleguide.components.card.textColor} />
                  <List.Item.Detail.Metadata.Separator />

                  <List.Item.Detail.Metadata.TagList title="Mode">
                    <List.Item.Detail.Metadata.TagList.Item text={styleguide.mode} />
                  </List.Item.Detail.Metadata.TagList>
                  <List.Item.Detail.Metadata.TagList title="Prioritize">
                    <List.Item.Detail.Metadata.TagList.Item text={prioritize} />
                  </List.Item.Detail.Metadata.TagList>
                </List.Item.Detail.Metadata>
              }
            />
          }
          actions={
            <ActionPanel>
              <Action.Push
                icon={Icon.CodeBlock}
                title="Search"
                target={<SearchStyleguide onSearched={updateStyleguides} />}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}

function SearchStyleguide({ onSearched }: { onSearched: (styleguide: StyleguideInStorage) => void }) {
  const { pop } = useNavigation();
  type FormValues = {
    domain: string;
    prioritize: string;
  };
  const { handleSubmit, itemProps } = useForm<FormValues>({
    async onSubmit(values) {
      const toast = await showToast(Toast.Style.Animated, "Retrieving Styleguide", values.domain);
      const params = new URLSearchParams({
        domain: values.domain,
        prioritize: values.prioritize === "quality" ? "quality" : "speed",
      });
      try {
        const response = await fetch(API_URL + `styleguide?${params}`, {
          headers: API_HEADERS,
        });
        const result = await parseBrandDevResponse<StyleguideResult>(response);
        const newStyleguide: StyleguideInStorage = {
          ...result,
          prioritize: values.prioritize,
          created_on: new Date().toISOString(),
          updated_on: new Date().toISOString(),
        };
        toast.style = Toast.Style.Success;
        toast.title = "Retrieved Styleguide!";
        onSearched(newStyleguide);
        pop();
      } catch (error) {
        toast.style = Toast.Style.Failure;
        toast.title = "Failed";
        toast.message = `${error}`;
      }
    },
    validation: {
      domain: FormValidation.Required,
    },
  });
  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm icon={Icon.CodeBlock} title="Retrieve Styleguide" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField title="Domain" placeholder="brand.dev" {...itemProps.domain} />
      <Form.Dropdown title="Prioritize" {...itemProps.prioritize}>
        <Form.Dropdown.Item title="Quality" value="quality" />
        <Form.Dropdown.Item title="Speed" value="speed" />
      </Form.Dropdown>
    </Form>
  );
}
