import { Children, PropsWithChildren } from "react";

export type ComponentReverserProps = PropsWithChildren<{
  reverse?: boolean;
}>;

const ComponentReverser = (props: ComponentReverserProps) => {
  const children = Children.toArray(props.children);
  if (props.reverse) children.reverse();
  return <>{children}</>;
};

export default ComponentReverser;
