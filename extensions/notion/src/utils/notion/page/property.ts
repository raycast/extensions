import { NotionObject } from "..";
import { UnwrapRecord } from "../../types";

type NotionProperties<T, TObject> = T extends { object: TObject; properties: infer U } ? U : never;
export type PagePropertyType = UnwrapRecord<NotionProperties<NotionObject, "page">>;
