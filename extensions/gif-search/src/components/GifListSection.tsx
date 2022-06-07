import { ListOrGridSection } from "./ListOrGrid";
import { GifResult } from "./GifResult";
import type { IGif } from "../models/gif";
import { LayoutType, ServiceName } from "../preferences";

export interface GifListSectionProps {
  layoutType?: LayoutType;
  title?: string;
  term?: string;
  hide?: boolean;
  results?: IGif[];
  service?: ServiceName;
}

export function GifListSection(props: GifListSectionProps) {
  let { title } = props;
  if (props.term) {
    title = `GIF results for "${props.term}"`;
  }

  return !props.hide ? (
    <ListOrGridSection layoutType={props.layoutType} title={title} key={props.title}>
      {props.results?.map((result, index) => (
        <GifResult layoutType={props.layoutType} key={result.id} item={result} index={index} service={props.service} />
      ))}
    </ListOrGridSection>
  ) : null;
}
