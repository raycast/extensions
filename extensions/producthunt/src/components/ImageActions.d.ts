import { ReactElement } from "react";
import { Product } from "../types";

export interface ImageActionsProps {
  imageUrl: string;
  showAsSubmenu?: boolean;
}

export function ImageActions(props: ImageActionsProps): ReactElement | ReactElement[];

export interface ImageDetailViewProps {
  product: Product;
  imageUrl: string;
  imageIndex: number;
  allImages: string[];
}

export function ImageDetailView(props: ImageDetailViewProps): ReactElement;
