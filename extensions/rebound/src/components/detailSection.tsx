import { Detail, List } from "@raycast/api";
import { Children, Fragment, FunctionComponent, isValidElement } from "react";

export type DetailSection = {
  title?: string;
  noSeparator?: boolean;
  children: React.ReactNode;
};

function BaseDetailSection(
  props: Readonly<
    DetailSection & {
      Metadata: typeof List.Item.Detail.Metadata | typeof Detail.Metadata;
    }
  >,
) {
  const { title, noSeparator = false, children, Metadata } = props;

  const isDisplayableChildren = Children.map(children, (child) => {
    if (!isValidElement(child)) {
      return false;
    }

    /* eslint-disable @typescript-eslint/ban-ts-comment */

    try {
      let node = child;

      try {
        if ((child as { type: { $$wrapped?: FunctionComponent } }).type.$$wrapped) {
          // @ts-ignore
          node = child.type(child.props);
        }
      } catch (error) {
        /* empty */
      }

      // @ts-ignore
      return node.type(node.props) !== null;
    } catch (error) {
      return false;
    }

    /* eslint-enable @typescript-eslint/ban-ts-comment */
  });

  if (isDisplayableChildren?.every((isValid: boolean) => !isValid)) {
    return null;
  }

  return (
    <>
      {noSeparator ? null : <Metadata.Separator />}
      {title ? <Metadata.Label title={title} /> : null}
      {children}
    </>
  );
}

export function ListItemDetailSection(props: Readonly<DetailSection>) {
  return <BaseDetailSection {...props} Metadata={List.Item.Detail.Metadata} />;
}
ListItemDetailSection.$$wrapped = BaseDetailSection;

export function DetailsDetailSection(props: Readonly<DetailSection>) {
  return <BaseDetailSection {...props} Metadata={Detail.Metadata} />;
}
DetailsDetailSection.$$wrapped = BaseDetailSection;
