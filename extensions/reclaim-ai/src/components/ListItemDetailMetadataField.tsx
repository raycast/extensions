import { List } from "@raycast/api";
import type { FC } from "react";

export type ListItemDetailMetadataFieldProps = { title: string; value: string; description?: string };

export const ListItemDetailMetadataField: FC<ListItemDetailMetadataFieldProps> = ({ title, value, description }) => {
  /********************/
  /*   custom hooks   */
  /********************/

  /********************/
  /*     useState     */
  /********************/

  /********************/
  /* useMemo & consts */
  /********************/

  /********************/
  /*    useCallback   */
  /********************/

  /********************/
  /*    useEffects    */
  /********************/

  /********************/
  /*       JSX        */
  /********************/

  return (
    <>
      <List.Item.Detail.Metadata.Label title={title} />
      <List.Item.Detail.Metadata.Label title={value} text={description} />
      <List.Item.Detail.Metadata.Separator />
    </>
  );
};
