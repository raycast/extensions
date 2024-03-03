import "react";

type RenderSubComponents<T> = (result: T) => React.ReactNode;

export function renderSubComponent<T>(result: T, component: RenderSubComponents<T> | RenderSubComponents<T>[]) {
  if (Array.isArray(component)) {
    return <>{component.map((cmp) => cmp(result))}</>;
  } else {
    return component(result);
  }
}
