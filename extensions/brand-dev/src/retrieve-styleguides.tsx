import { Action, ActionPanel, Form, Icon, Keyboard, List, Toast, showToast, useNavigation } from "@raycast/api";
import { FormValidation, getFavicon, useForm, useLocalStorage } from "@raycast/utils";
import { API_HEADERS, API_URL, capitalize, parseBrandDevResponse } from "./common";
import { Styleguide } from "./types/styleguide";
import { Fragment } from "react/jsx-runtime";

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

function ColorItem({ title, text }: { title: string; text: string }) {
  return (
    <List.Item.Detail.Metadata.Label
      title={capitalize(title)}
      icon={{ source: Icon.CircleFilled, tintColor: text }}
      text={text}
    />
  );
}
function TextItem({ title, text }: { title: string; text: string | number }) {
  return <List.Item.Detail.Metadata.Label title={title} text={`${text}`} />;
}
function CopySubmenuAction({
  title,
  content,
  entries,
}: {
  title: string;
  content: unknown;
  entries?: Record<string, string | number>;
}) {
  return (
    <ActionPanel.Submenu icon={Icon.CopyClipboard} title={`Copy ${title}`}>
      <Action.CopyToClipboard title="All as JSON" content={JSON.stringify(content)} />
      {Object.entries(entries ?? {}).map(([key, val]) => (
        <Action.CopyToClipboard key={key} title={key} content={val} />
      ))}
    </ActionPanel.Submenu>
  );
}
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
                  {Object.entries(styleguide.colors).map(([key, val]) => (
                    <ColorItem key={key} title={key} text={val} />
                  ))}
                  <List.Item.Detail.Metadata.Separator />

                  <List.Item.Detail.Metadata.Label title="Typography" />
                  {Object.entries({ ...styleguide.typography.headings, ...{ p: styleguide.typography.p } }).map(
                    ([key, val]) => (
                      <Fragment key={key}>
                        <List.Item.Detail.Metadata.Label title={key.toUpperCase()} />
                        <TextItem title="Font Family" text={val.fontFamily} />
                        <TextItem title="Font Size" text={val.fontSize} />
                        <TextItem title="Font Weight" text={val.fontWeight.toString()} />
                        <TextItem title="Line Height" text={val.lineHeight} />
                        <TextItem title="Letter Spacing" text={val.letterSpacing} />
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
                  {Object.entries(styleguide.components.button).map(([key, val]) => (
                    <Fragment key={key}>
                      <List.Item.Detail.Metadata.Label title={`BUTTON - ${key}`} />
                      <ColorItem title="Background Color" text={val.backgroundColor} />
                      <ColorItem title="Color" text={val.color} />
                      <ColorItem title="Border Color" text={val.borderColor} />
                      <TextItem title="Border Radius" text={val.borderRadius} />
                      <TextItem title="Border Width" text={val.borderWidth} />
                      <TextItem title="Border Style" text={val.borderStyle} />
                      <TextItem title="Padding" text={val.padding} />
                      <TextItem title="Font Size" text={val.fontSize} />
                      <TextItem title="Font Weight" text={val.fontWeight} />
                      <TextItem title="Text Decoration" text={val.textDecoration} />
                      <TextItem title="Box Shadow" text={val.boxShadow} />
                      <List.Item.Detail.Metadata.Label title="" />
                    </Fragment>
                  ))}

                  <List.Item.Detail.Metadata.Label title="CARD" />
                  <ColorItem title="Background Color" text={styleguide.components.card.backgroundColor} />
                  <ColorItem title="Border Color" text={styleguide.components.card.borderColor} />
                  <List.Item.Detail.Metadata.Label
                    title="Border Radius"
                    text={styleguide.components.card.borderRadius}
                  />
                  <TextItem title="Border Width" text={styleguide.components.card.borderWidth} />
                  <TextItem title="Border Style" text={styleguide.components.card.borderStyle} />
                  <TextItem title="Padding" text={styleguide.components.card.padding} />
                  <TextItem title="Box Shadow" text={styleguide.components.card.boxShadow} />
                  <ColorItem title="Text Color" text={styleguide.components.card.textColor} />
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
              <CopySubmenuAction title="Colors" content={styleguide.colors} entries={styleguide.colors} />
              <CopySubmenuAction title="Typography" content={styleguide.typography} />
              <CopySubmenuAction
                title="Element Spacing"
                content={styleguide.elementSpacing}
                entries={styleguide.elementSpacing}
              />
              <CopySubmenuAction title="Shadows" content={styleguide.shadows} entries={styleguide.shadows} />
              <CopySubmenuAction title="Components" content={styleguide.components} />
              <Action.Push
                shortcut={Keyboard.Shortcut.Common.New}
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
