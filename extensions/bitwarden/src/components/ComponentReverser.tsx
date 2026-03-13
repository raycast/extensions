import { Children, ReactNode } from "react";

type SyncChildren = Exclude<ReactNode, Promise<unknown>>;

export type ComponentReverserProps = {
  reverse?: boolean;
  children?: SyncChildren;
};

const ComponentReverser = (props: ComponentReverserProps) => {
  const children = Children.toArray(props.children) as SyncChildren[];
  if (props.reverse) children.reverse();
  return <>{children}</>;
};

export default ComponentReverser;
