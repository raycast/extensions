import { Children, isValidElement, ReactNode } from "react";

export type ComponentOrdererProps = {
  /**
   * Key of the child that should appear first. Others stay in their original order.
   * The key is the value of the `data-order-key` attribute of the child.
   */
  first?: string;
  children?: ReactNode;
};

const ComponentOrderer = ({ first, children }: ComponentOrdererProps) => {
  const childArray = Children.toArray(children);
  if (!first) return <>{childArray}</>;

  const firstIndex = childArray.findIndex((child) => {
    if (!isValidElement(child) || !child.props) return false;
    const props = child.props as Record<string, string>;
    return props && props["data-order-key"] === first;
  });

  if (firstIndex <= 0) return <>{childArray}</>;

  return (
    <>
      {childArray[firstIndex]}
      {childArray.slice(0, firstIndex)}
      {childArray.slice(firstIndex + 1)}
    </>
  );
};

export default ComponentOrderer;
