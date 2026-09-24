import { isWorkspace, type Workspace } from "@type/octarine";

export type IndexedWorkspace = Workspace & {
  ignored: boolean;
  invalid: boolean;
};

export function isIndexedWorkspace(value: unknown): value is IndexedWorkspace {
  return (
    isWorkspace(value) &&
    typeof (value as IndexedWorkspace).ignored === "boolean" &&
    typeof (value as IndexedWorkspace).invalid === "boolean"
  );
}
